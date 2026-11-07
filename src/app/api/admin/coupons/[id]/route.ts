import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { calculateCouponDiscount } from '@/lib/coupons';
import { Database } from '@/lib/supabase/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile: adminProfile } = await requireAdmin();
    const { id: couponId } = await params;

    if (!couponId) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: existingCoupon, error: fetchErr } = await admin
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .single();

    if (fetchErr || !existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: Database['public']['Tables']['coupons']['Update'] = {};
    const auditActions: string[] = [];

    // Active state toggle
    if (body.active !== undefined) {
      const newActive = Boolean(body.active);
      if (newActive !== existingCoupon.active) {
        updates.active = newActive;
        auditActions.push(newActive ? 'coupon_reactivated' : 'coupon_deactivated');
      }
    }

    // Expiration update
    if (body.expiresAt !== undefined) {
      const newExpiresAt = body.expiresAt ? new Date(body.expiresAt).toISOString() : null;
      if (newExpiresAt && existingCoupon.starts_at && new Date(existingCoupon.starts_at) >= new Date(newExpiresAt)) {
        return NextResponse.json(
          { error: 'Expiration date must be after start date.' },
          { status: 400 }
        );
      }
      updates.expires_at = newExpiresAt;
    }

    // Max redemptions update
    if (body.maxRedemptions !== undefined) {
      const maxR = body.maxRedemptions !== null && body.maxRedemptions !== ''
        ? parseInt(body.maxRedemptions, 10)
        : null;
      if (maxR !== null && (isNaN(maxR) || maxR <= 0)) {
        return NextResponse.json(
          { error: 'Max redemptions must be a positive integer or null.' },
          { status: 400 }
        );
      }
      updates.max_redemptions = maxR;
    }

    // Per-user limit update
    if (body.maxRedemptionsPerUser !== undefined) {
      const perUser = parseInt(body.maxRedemptionsPerUser, 10);
      if (isNaN(perUser) || perUser <= 0) {
        return NextResponse.json(
          { error: 'Max redemptions per user must be a positive integer.' },
          { status: 400 }
        );
      }
      updates.max_redemptions_per_user = perUser;
    }

    // Discount value update
    if (body.discountValue !== undefined) {
      const calc = calculateCouponDiscount(existingCoupon.discount_type, body.discountValue);
      if (!calc.valid) {
        return NextResponse.json(
          { error: calc.error || 'Invalid discount value.' },
          { status: 400 }
        );
      }
      updates.discount_value = calc.discountValue;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No changes provided.', coupon: existingCoupon });
    }

    const nowIso = new Date().toISOString();
    updates.updated_at = nowIso;

    const { data: updatedCoupon, error: updateErr } = await admin
      .from('coupons')
      .update(updates)
      .eq('id', couponId)
      .select('*')
      .single();

    if (updateErr || !updatedCoupon) {
      return NextResponse.json({ error: updateErr?.message || 'Failed to update coupon.' }, { status: 500 });
    }

    const primaryAction = auditActions[0] || 'coupon_updated';

    await logAdminAction({
      adminUserId: adminProfile.id,
      action: primaryAction as any,
      targetCouponId: couponId,
      metadata: {
        code: updatedCoupon.code,
        changes: updates,
        adminEmail: adminProfile.email,
      },
    });

    return NextResponse.json({
      success: true,
      coupon: updatedCoupon,
      message: `Coupon ${updatedCoupon.code} updated successfully.`,
    });
  } catch (err: any) {
    const s = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error updating coupon' },
      { status: s }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile: adminProfile } = await requireAdmin();
    const { id: couponId } = await params;

    if (!couponId) {
      return NextResponse.json({ error: 'Coupon ID is required.' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: existingCoupon, error: fetchErr } = await admin
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .single();

    if (fetchErr || !existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found.' }, { status: 404 });
    }

    // Integrity Rule: Coupon must have zero redemptions
    if ((existingCoupon.redemption_count || 0) > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete coupon "${existingCoupon.code}" because it has already been redeemed ${existingCoupon.redemption_count} time(s). Redeemed coupons must be preserved for accounting history and audit consistency.`,
          code: 'COUPON_ALREADY_REDEEMED',
        },
        { status: 400 }
      );
    }

    // Integrity Rule: Verify no dependent records in coupon_redemptions
    const { count: redemptionsCount, error: countErr } = await admin
      .from('coupon_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', couponId);

    if (countErr) {
      return NextResponse.json(
        { error: 'Failed to verify coupon redemption history.' },
        { status: 500 }
      );
    }

    if ((redemptionsCount || 0) > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete coupon "${existingCoupon.code}" because ${redemptionsCount} dependent redemption record(s) exist. Redeemed coupons cannot be permanently deleted.`,
          code: 'COUPON_ALREADY_REDEEMED',
        },
        { status: 400 }
      );
    }

    // Integrity Rule: Verify no payment orders reference this coupon
    const { count: ordersCount, error: ordersErr } = await admin
      .from('payment_orders')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', couponId);

    if (ordersErr) {
      return NextResponse.json(
        { error: 'Failed to verify payment order references.' },
        { status: 500 }
      );
    }

    if ((ordersCount || 0) > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete coupon "${existingCoupon.code}" because it is referenced in ${ordersCount} payment order(s). Active order references must be preserved.`,
          code: 'COUPON_REFERENCED_IN_ORDERS',
        },
        { status: 400 }
      );
    }

    // Attempt atomic RPC deletion first if available in the database schema
    let atomicSucceeded = false;
    try {
      const { data: rpcRows, error: rpcErr } = await (admin as any).rpc('admin_delete_coupon_atomic', {
        p_admin_user_id: adminProfile.id,
        p_coupon_id: couponId,
        p_reason: `Permanently deleted unredeemed coupon ${existingCoupon.code}`,
      });

      if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
        const result = (rpcRows as any[])[0];
        if (!result.success) {
          return NextResponse.json(
            { error: result.error_message || 'Failed to delete coupon.', code: result.error_code },
            { status: 400 }
          );
        }
        atomicSucceeded = true;
      }
    } catch {
      // RPC may not be applied yet in all environments; proceed to application-level atomic pattern
    }

    if (!atomicSucceeded) {
      // Safe application-level deletion sequence
      const { error: deleteErr } = await admin
        .from('coupons')
        .delete()
        .eq('id', couponId);

      if (deleteErr) {
        return NextResponse.json(
          { error: deleteErr.message || 'Failed to delete coupon.' },
          { status: 500 }
        );
      }

      // Audit log
      await logAdminAction({
        adminUserId: adminProfile.id,
        action: 'coupon_deleted',
        targetCouponId: couponId,
        metadata: {
          code: existingCoupon.code,
          discountType: existingCoupon.discount_type,
          discountValue: existingCoupon.discount_value,
          adminEmail: adminProfile.email,
          deletedAt: new Date().toISOString(),
        },
        reason: `Permanently deleted unredeemed coupon ${existingCoupon.code}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Coupon "${existingCoupon.code}" was permanently deleted.`,
      deletedCouponId: couponId,
      code: existingCoupon.code,
    });
  } catch (err: any) {
    const s = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error deleting coupon' },
      { status: s }
    );
  }
}
