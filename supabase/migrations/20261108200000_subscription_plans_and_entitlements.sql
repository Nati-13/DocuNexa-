-- ============================================================================
-- LOCAL MIGRATION: Subscription Plans Catalog, Atomic Admin Approval RPC, & Entitlements
-- DO NOT RUN AGAINST PRODUCTION WITHOUT SEPARATE EXPLICIT AUTHORIZATION
-- ============================================================================

-- 1. Add subscription tracking columns to profiles table (nullable by default)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Update profiles_plan_check to support authoritative plan catalog IDs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'profiles' AND c.conname = 'profiles_plan_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_plan_check;
  END IF;

  ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check
    CHECK (plan IN ('free', 'weekly', 'weekly_pro', 'monthly', 'monthly_pro', 'yearly', 'yearly_pro', 'ad_free'));
END $$;

-- 3. Add plan identifier, duration, and administrator review audit columns to payment_orders table
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_duration_days INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_orders_reviewed_by
  ON public.payment_orders(reviewed_by);

-- 4. Update payment_orders_status_check to support 'ambiguous' workflow status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'payment_orders' AND c.conname = 'payment_orders_status_check'
  ) THEN
    ALTER TABLE public.payment_orders DROP CONSTRAINT payment_orders_status_check;
  END IF;

  ALTER TABLE public.payment_orders ADD CONSTRAINT payment_orders_status_check
    CHECK (status IN ('pending', 'detected', 'confirmed', 'expired', 'amount_mismatch', 'late_payment', 'cancelled', 'ambiguous'));
END $$;

-- 5. Update payment_orders_network_check to allow 'Bybit_UID' alongside 'Polygon', 'Aptos', and 'TRON'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'payment_orders' AND c.conname = 'payment_orders_network_check'
  ) THEN
    ALTER TABLE public.payment_orders DROP CONSTRAINT payment_orders_network_check;
  END IF;

  ALTER TABLE public.payment_orders ADD CONSTRAINT payment_orders_network_check
    CHECK (network IN ('Polygon', 'Aptos', 'TRON', 'Bybit_UID'));
END $$;

-- 6. Backfill existing payment_orders from product column and catalog durations
UPDATE public.payment_orders
SET plan_id = product,
    subscription_duration_days = CASE product
      WHEN 'ad_free' THEN 0
      WHEN 'weekly' THEN 7
      WHEN 'weekly_pro' THEN 7
      WHEN 'monthly' THEN 30
      WHEN 'monthly_pro' THEN 30
      WHEN 'yearly' THEN 365
      WHEN 'yearly_pro' THEN 365
      ELSE NULL
    END
WHERE plan_id IS NULL AND product IS NOT NULL;

-- 7. Create index on subscription_expires_at for fast entitlement checks
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires_at
  ON public.profiles(subscription_expires_at);

-- 8. Network-scoped partial unique index on confirmed on-chain transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_confirmed_tx_unique
  ON public.payment_orders (network, lower(trim(tx_id)))
  WHERE status = 'confirmed' AND tx_id IS NOT NULL AND trim(tx_id) <> '';

-- 9. Atomic Administrator Payment Approval Function
CREATE OR REPLACE FUNCTION public.admin_approve_payment_atomic(
  p_payment_id UUID,
  p_admin_user_id UUID,
  p_tx_id TEXT DEFAULT NULL,
  p_bybit_deposit_id TEXT DEFAULT NULL,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_order RECORD;
  v_profile RECORD;
  v_target_plan TEXT;
  v_duration_days INT;
  v_expires_at TIMESTAMPTZ;
  v_start_at TIMESTAMPTZ;
  v_clean_tx_id TEXT := NULLIF(trim(p_tx_id), '');
  v_clean_bybit_deposit_id TEXT := NULLIF(trim(p_bybit_deposit_id), '');
BEGIN
  -- 1. Authorization check: caller must be a registered administrator in public.admin_users
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_admin_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: caller is not a registered administrator.',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  -- 2. Lock payment order FOR UPDATE
  SELECT * INTO v_order
  FROM public.payment_orders
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment order not found.',
      'code', 'NOT_FOUND'
    );
  END IF;

  -- 3. Lock profile early FOR UPDATE
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_order.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Customer profile not found for user ' || v_order.user_id,
      'code', 'PROFILE_NOT_FOUND'
    );
  END IF;

  -- 4. Idempotency & Conflicting Transaction Check
  IF v_order.status = 'confirmed' THEN
    IF v_clean_tx_id IS NOT NULL 
       AND v_order.tx_id IS NOT NULL 
       AND lower(trim(v_order.tx_id)) <> lower(v_clean_tx_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Order is already confirmed with a conflicting transaction ID: ' || v_order.tx_id,
        'code', 'CONFLICTING_TX_ID'
      );
    END IF;

    IF v_clean_bybit_deposit_id IS NOT NULL 
       AND v_order.bybit_deposit_id IS NOT NULL 
       AND v_order.bybit_deposit_id <> v_clean_bybit_deposit_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Order is already confirmed with a conflicting Bybit deposit ID: ' || v_order.bybit_deposit_id,
        'code', 'CONFLICTING_DEPOSIT_ID'
      );
    END IF;

    -- Return idempotent confirmation without re-mutating or adding duplicate audit logs
    RETURN jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'payment_id', p_payment_id,
      'status', 'confirmed',
      'confirmed_at', v_order.confirmed_at,
      'user_id', v_order.user_id,
      'plan', v_profile.plan,
      'subscription_expires_at', v_profile.subscription_expires_at,
      'message', 'Payment order was previously confirmed with identical details.'
    );
  END IF;

  -- Verify order status is eligible for review
  IF v_order.status NOT IN ('pending', 'detected', 'ambiguous', 'amount_mismatch', 'late_payment', 'expired', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order in status "' || v_order.status || '" cannot be approved.',
      'code', 'INVALID_STATUS'
    );
  END IF;

  -- Exceptional statuses require a detailed justification of at least 10 characters
  IF v_order.status IN ('amount_mismatch', 'expired', 'cancelled') AND (p_review_notes IS NULL OR length(trim(p_review_notes)) < 10) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Approval of order in status "' || v_order.status || '" requires a detailed review note of at least 10 characters.',
      'code', 'INSUFFICIENT_JUSTIFICATION'
    );
  END IF;

  -- Payment evidence enforcement: Reject approval if no evidence exists on order or in request
  IF v_clean_tx_id IS NULL AND v_clean_bybit_deposit_id IS NULL AND v_order.tx_id IS NULL AND v_order.bybit_deposit_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot confirm payment order without transaction ID or Bybit deposit ID evidence.',
      'code', 'MISSING_PAYMENT_EVIDENCE'
    );
  END IF;

  -- 5. Replay Protection: Check if transaction identity has been consumed by another confirmed order
  IF v_clean_tx_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.payment_orders
      WHERE id <> p_payment_id
        AND status = 'confirmed'
        AND network = v_order.network
        AND lower(trim(tx_id)) = lower(v_clean_tx_id)
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Transaction ID already consumed by another confirmed order on network ' || v_order.network || '.',
        'code', 'TRANSACTION_ALREADY_CONSUMED'
      );
    END IF;
  END IF;

  IF v_clean_bybit_deposit_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.payment_orders
      WHERE id <> p_payment_id
        AND bybit_deposit_id = v_clean_bybit_deposit_id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Bybit deposit ID already associated with another order.',
        'code', 'BYBIT_DEPOSIT_ALREADY_CONSUMED'
      );
    END IF;
  END IF;

  -- 6. Authoritative Plan & Duration Resolution
  v_target_plan := COALESCE(v_order.plan_id, v_order.product);

  -- Free orders must not grant paid entitlements
  IF lower(COALESCE(v_target_plan, '')) = 'free' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Free orders cannot be approved as paid subscription entitlements.',
      'code', 'INVALID_FREE_ORDER'
    );
  END IF;

  v_duration_days := v_order.subscription_duration_days;
  IF v_duration_days IS NULL OR v_duration_days = 0 THEN
    CASE lower(COALESCE(v_target_plan, ''))
      WHEN 'weekly', 'weekly_pro' THEN v_duration_days := 7;
      WHEN 'monthly', 'monthly_pro' THEN v_duration_days := 30;
      WHEN 'yearly', 'yearly_pro' THEN v_duration_days := 365;
      WHEN 'ad_free' THEN v_duration_days := 0;
      ELSE v_duration_days := NULL;
    END CASE;
  END IF;

  -- Guard: Only validated paid plans are accepted
  IF lower(COALESCE(v_target_plan, '')) NOT IN ('weekly', 'weekly_pro', 'monthly', 'monthly_pro', 'yearly', 'yearly_pro', 'ad_free') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unrecognized plan identifier: ' || COALESCE(v_target_plan, '<null>'),
      'code', 'UNKNOWN_PLAN'
    );
  END IF;

  -- Guard: Non-lifetime paid plan must have positive duration
  IF lower(v_target_plan) <> 'ad_free' AND (v_duration_days IS NULL OR v_duration_days <= 0) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid duration for paid plan "' || v_target_plan || '". Expected positive duration.',
      'code', 'INVALID_PLAN_DURATION'
    );
  END IF;

  -- 7. Lifetime Entitlement Preservation & Calculation
  -- Policy: If customer already has grandfathered Lifetime Ad-Free access, PRESERVE IT UNCONDITIONALLY
  IF v_profile.plan = 'ad_free' AND v_profile.subscription_expires_at IS NULL THEN
    v_target_plan := 'ad_free';
    v_expires_at := NULL;
    v_start_at := COALESCE(v_profile.subscription_started_at, v_now);
  ELSIF lower(v_target_plan) = 'ad_free' THEN
    -- New Lifetime entitlement granted ONLY by an explicit 'ad_free' order
    v_expires_at := NULL;
    v_target_plan := 'ad_free';
    v_start_at := COALESCE(v_profile.subscription_started_at, v_now);
  ELSIF v_duration_days > 0 THEN
    -- Active time-limited subscription extension
    IF v_profile.subscription_expires_at IS NOT NULL AND v_profile.subscription_expires_at > v_now THEN
      v_expires_at := v_profile.subscription_expires_at + (v_duration_days || ' days')::interval;
      v_start_at := COALESCE(v_profile.subscription_started_at, v_now);
    ELSE
      -- New or expired subscription starts from current time
      v_expires_at := v_now + (v_duration_days || ' days')::interval;
      v_start_at := v_now;
    END IF;
  ELSE
    -- Fails closed: Under no circumstances can any other branch grant lifetime
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unable to resolve valid entitlement for plan "' || v_target_plan || '".',
      'code', 'INVALID_ENTITLEMENT_RESOLUTION'
    );
  END IF;

  -- 8. Update Payment Order
  UPDATE public.payment_orders
  SET status = 'confirmed',
      confirmed_at = COALESCE(confirmed_at, v_now),
      tx_id = COALESCE(v_clean_tx_id, tx_id),
      bybit_deposit_id = COALESCE(v_clean_bybit_deposit_id, bybit_deposit_id),
      received_amount = COALESCE(received_amount, payment_amount_usdt),
      failure_reason = NULL,
      reviewed_by = p_admin_user_id,
      reviewed_at = v_now,
      review_notes = COALESCE(NULLIF(trim(p_review_notes), ''), review_notes),
      updated_at = v_now
  WHERE id = p_payment_id;

  -- 9. Update Customer Profile Entitlement
  UPDATE public.profiles
  SET plan = v_target_plan,
      subscription_started_at = v_start_at,
      subscription_expires_at = v_expires_at,
      updated_at = v_now
  WHERE id = v_order.user_id;

  -- 10. Insert Admin Audit Log
  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    target_user_id,
    target_payment_id,
    target_coupon_id,
    metadata,
    reason,
    created_at
  ) VALUES (
    p_admin_user_id,
    'payment_manually_approved',
    v_order.user_id,
    p_payment_id,
    v_order.coupon_id,
    jsonb_build_object(
      'orderId', v_order.order_id,
      'network', v_order.network,
      'currency', v_order.currency,
      'previousStatus', v_order.status,
      'paymentAmountUsdt', v_order.payment_amount_usdt,
      'evidenceTxId', COALESCE(v_clean_tx_id, v_order.tx_id),
      'bybitDepositId', COALESCE(v_clean_bybit_deposit_id, v_order.bybit_deposit_id),
      'grantedPlan', v_target_plan,
      'durationDays', v_duration_days,
      'subscriptionExpiresAt', v_expires_at
    ),
    p_review_notes,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'status', 'confirmed',
    'confirmed_at', v_now,
    'user_id', v_order.user_id,
    'plan', v_target_plan,
    'subscription_expires_at', v_expires_at
  );
END;
$$;

-- Restrict execution to service_role only
REVOKE ALL ON FUNCTION public.admin_approve_payment_atomic(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_approve_payment_atomic(UUID, UUID, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_approve_payment_atomic(UUID, UUID, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_payment_atomic(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
