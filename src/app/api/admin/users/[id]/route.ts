import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { guardApiRequest } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
    rateLimitAction: 'admin-user-detail',
    maxRequests: 60,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    await requireAdmin();
    const { id: targetUserId } = await params;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    // 1. Fetch user profile
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch Supabase Auth metadata safely (never reading passwords/hashes)
    let authMeta: any = null;
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(targetUserId);
      if (authUser?.user) {
        authMeta = {
          emailConfirmedAt: authUser.user.email_confirmed_at,
          lastSignInAt: authUser.user.last_sign_in_at,
          bannedUntil: (authUser.user as any).banned_until || null,
          role: authUser.user.role,
        };
      }
    } catch {
      // Non-critical if auth lookup fails
    }

    // 3. Fetch payment history
    const { data: payments } = await admin
      .from('payment_orders')
      .select('id, order_id, status, payment_amount_usdt, received_amount, final_amount_usdt, currency, network, created_at, confirmed_at, expires_at, tx_id, coupon_code')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    // 4. Fetch coupon redemptions
    const { data: redemptions } = await admin
      .from('coupon_redemptions')
      .select('id, coupon_id, discount_amount_usdt, redeemed_at')
      .eq('user_id', targetUserId)
      .order('redeemed_at', { ascending: false });

    // 5. Fetch audit events concerning this user
    const { data: auditEvents } = await admin
      .from('admin_audit_logs')
      .select('id, action, reason, created_at, metadata')
      .eq('target_user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        plan: profile.plan,
        isSuspended: Boolean(profile.is_suspended),
        status: profile.is_suspended ? 'suspended' : 'active',
        entitlementExpiry: profile.plan === 'ad_free' ? 'Lifetime Access' : 'N/A',
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        auth: authMeta,
      },
      payments: payments || [],
      couponRedemptions: redemptions || [],
      auditEvents: auditEvents || [],
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error fetching user details' },
      { status }
    );
  }
}
