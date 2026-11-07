-- DocuNexa — Atomic Admin Coupon Deletion Migration
-- Ensures atomic row locking (FOR UPDATE), checks for zero redemptions,
-- ensures zero records in coupon_redemptions AND payment_orders,
-- logs the audit entry BEFORE deletion to satisfy foreign-key constraints,
-- restricts execution privileges to service_role only,
-- and rolls back atomically on any error.

CREATE OR REPLACE FUNCTION public.admin_delete_coupon_atomic(
  p_admin_user_id uuid,
  p_coupon_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  deleted_code text,
  error_message text,
  error_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_coupon RECORD;
  v_redemption_count integer;
  v_order_count integer;
BEGIN
  -- 0. Authorization check: Verify administrator identity in public.admin_users
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = p_admin_user_id
  ) THEN
    RETURN QUERY SELECT false, NULL::text, 'Unauthorized: caller is not an administrator.'::text, 'UNAUTHORIZED_ADMIN'::text;
    RETURN;
  END IF;

  -- 1. Lock the coupon row FOR UPDATE to prevent race conditions during deletion
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE id = p_coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, 'Coupon not found.'::text, 'COUPON_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- 2. Check redemption count on the coupon itself
  IF COALESCE(v_coupon.redemption_count, 0) > 0 THEN
    RETURN QUERY SELECT false, v_coupon.code,
      format('Cannot delete coupon "%s" because it has already been redeemed %s time(s). Redeemed coupons must be preserved for financial audit consistency.', v_coupon.code, v_coupon.redemption_count),
      'COUPON_ALREADY_REDEEMED'::text;
    RETURN;
  END IF;

  -- 3. Verify no dependent redemption records exist in coupon_redemptions
  SELECT COUNT(*) INTO v_redemption_count
  FROM public.coupon_redemptions
  WHERE coupon_id = p_coupon_id;

  IF v_redemption_count > 0 THEN
    RETURN QUERY SELECT false, v_coupon.code,
      format('Cannot delete coupon "%s" because %s redemption record(s) exist in coupon_redemptions. Redeemed coupons cannot be deleted.', v_coupon.code, v_redemption_count),
      'COUPON_ALREADY_REDEEMED'::text;
    RETURN;
  END IF;

  -- 4. Verify no payment orders reference this coupon (financial integrity check)
  SELECT COUNT(*) INTO v_order_count
  FROM public.payment_orders
  WHERE coupon_id = p_coupon_id;

  IF v_order_count > 0 THEN
    RETURN QUERY SELECT false, v_coupon.code,
      format('Cannot delete coupon "%s" because it is referenced in %s payment order(s). Active order references must be preserved.', v_coupon.code, v_order_count),
      'COUPON_REFERENCED_IN_ORDERS'::text;
    RETURN;
  END IF;

  -- 5. Insert audit trail BEFORE deletion while coupon foreign key is valid
  -- When the coupon is subsequently deleted, target_coupon_id is set to NULL
  -- by the ON DELETE SET NULL foreign key constraint, while metadata preserves the full identity.
  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    target_coupon_id,
    metadata,
    reason,
    created_at
  ) VALUES (
    p_admin_user_id,
    'coupon_deleted',
    p_coupon_id,
    jsonb_build_object(
      'coupon_id', p_coupon_id,
      'code', v_coupon.code,
      'discountType', v_coupon.discount_type,
      'discountValue', v_coupon.discount_value,
      'deletedAt', now()
    ),
    COALESCE(p_reason, format('Permanently deleted unredeemed coupon %s', v_coupon.code)),
    now()
  );

  -- 6. Delete the coupon row (FK triggers ON DELETE SET NULL on admin_audit_logs)
  DELETE FROM public.coupons
  WHERE id = p_coupon_id;

  RETURN QUERY SELECT true, v_coupon.code, NULL::text, NULL::text;
END;
$$;

-- Restrict execution: Revoke execution from PUBLIC, anon, and authenticated roles
REVOKE ALL ON FUNCTION public.admin_delete_coupon_atomic(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_coupon_atomic(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_delete_coupon_atomic(uuid, uuid, text) FROM authenticated;

-- Grant execution to service_role only
GRANT EXECUTE ON FUNCTION public.admin_delete_coupon_atomic(uuid, uuid, text) TO service_role;
