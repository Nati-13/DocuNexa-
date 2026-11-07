-- DocuNexa — Atomic Admin Coupon Deletion Migration
-- Ensures atomic row locking (FOR UPDATE), checks for zero redemptions,
-- ensures zero records in coupon_redemptions AND payment_orders,
-- logs the audit entry, and rolls back atomically on any error.

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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_coupon RECORD;
  v_redemption_count integer;
  v_order_count integer;
BEGIN
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

  -- 5. Delete the coupon row
  DELETE FROM public.coupons
  WHERE id = p_coupon_id;

  -- 6. Insert audit trail atomically in the same PostgreSQL transaction
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
      'code', v_coupon.code,
      'discountType', v_coupon.discount_type,
      'discountValue', v_coupon.discount_value,
      'deletedAt', now()
    ),
    COALESCE(p_reason, format('Permanently deleted unredeemed coupon %s', v_coupon.code)),
    now()
  );

  RETURN QUERY SELECT true, v_coupon.code, NULL::text, NULL::text;
END;
$$;
