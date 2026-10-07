import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getBybitConfig, parseExactUsdt } from '@/lib/payments/bybit';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
    rateLimitAction: 'admin-overview',
    maxRequests: 60,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    await requireAdmin();
    const admin = createAdminSupabaseClient();

    // 1. Users metrics
    const { count: totalUsers } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: freeUsers } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'free');

    const { count: adFreeUsers } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'ad_free');

    // Signups today & this week
    const now = new Date();
    const startOfTodayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeekIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startOfMonthIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count: signupsToday } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfTodayIso);

    const { count: signupsThisWeek } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfWeekIso);

    // 2. Payments metrics
    const { data: allOrders } = await admin
      .from('payment_orders')
      .select('*')
      .order('created_at', { ascending: false });

    const orders = allOrders || [];
    let confirmedCount = 0;
    let pendingCount = 0;
    let expiredCount = 0;
    let lateCount = 0;
    let amountMismatchCount = 0;

    let totalRevenueMicro = 0n;
    let revenueTodayMicro = 0n;
    let revenueWeekMicro = 0n;
    let revenueMonthMicro = 0n;

    for (const ord of orders) {
      if (ord.status === 'confirmed') {
        confirmedCount++;
        // Use received amount or final amount
        const revAmount = ord.received_amount || ord.final_amount_usdt || ord.payment_amount_usdt;
        const parsedRev = parseExactUsdt(revAmount);
        if (parsedRev.valid) {
          totalRevenueMicro += parsedRev.microUnits;
          const confTime = new Date(ord.confirmed_at || ord.created_at).getTime();
          if (confTime >= new Date(startOfTodayIso).getTime()) {
            revenueTodayMicro += parsedRev.microUnits;
          }
          if (confTime >= new Date(startOfWeekIso).getTime()) {
            revenueWeekMicro += parsedRev.microUnits;
          }
          if (confTime >= new Date(startOfMonthIso).getTime()) {
            revenueMonthMicro += parsedRev.microUnits;
          }
        }
      } else if (ord.status === 'pending' || ord.status === 'detected') {
        pendingCount++;
      } else if (ord.status === 'expired') {
        expiredCount++;
      } else if (ord.status === 'late_payment') {
        lateCount++;
      } else if (ord.status === 'amount_mismatch') {
        amountMismatchCount++;
      }
    }

    const formatMicro = (m: bigint) => (Number(m) / 1000000).toFixed(2);

    // 3. Coupons metrics
    const { data: coupons } = await admin.from('coupons').select('*');
    const couponList = coupons || [];
    const activeCouponsCount = couponList.filter((c) => c.active).length;

    const { data: redemptions } = await admin
      .from('coupon_redemptions')
      .select('*')
      .order('redeemed_at', { ascending: false })
      .limit(10);

    const { count: totalRedemptionsCount } = await admin
      .from('coupon_redemptions')
      .select('*', { count: 'exact', head: true });

    let totalDiscountGrantedMicro = 0n;
    const { data: allRedemptions } = await admin
      .from('coupon_redemptions')
      .select('discount_amount_usdt');

    if (allRedemptions) {
      for (const r of allRedemptions) {
        const p = parseExactUsdt(r.discount_amount_usdt);
        if (p.valid) totalDiscountGrantedMicro += p.microUnits;
      }
    }

    // Most used coupons
    const mostUsedCoupons = [...couponList]
      .sort((a, b) => (b.redemption_count || 0) - (a.redemption_count || 0))
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discount_type,
        discountValue: c.discount_value,
        redemptionCount: c.redemption_count,
        active: c.active,
      }));

    // 4. Configuration health (strictly no secrets exposed)
    const bybitConfig = getBybitConfig();
    const configHealth = {
      bybitApiKeyConfigured: Boolean(bybitConfig.apiKey),
      bybitApiSecretConfigured: Boolean(bybitConfig.apiSecret),
      bybitPolygonWalletConfigured: Boolean(bybitConfig.depositAddress),
      network: 'Polygon PoS',
      currency: 'USDT',
    };

    return NextResponse.json({
      success: true,
      users: {
        total: totalUsers || 0,
        free: freeUsers || 0,
        adFree: adFreeUsers || 0,
        signupsToday: signupsToday || 0,
        signupsThisWeek: signupsThisWeek || 0,
      },
      payments: {
        totalConfirmed: confirmedCount,
        pending: pendingCount,
        expired: expiredCount,
        latePayments: lateCount,
        amountMismatches: amountMismatchCount,
      },
      revenue: {
        totalRevenueUsdt: formatMicro(totalRevenueMicro),
        revenueTodayUsdt: formatMicro(revenueTodayMicro),
        revenueThisWeekUsdt: formatMicro(revenueWeekMicro),
        revenueThisMonthUsdt: formatMicro(revenueMonthMicro),
        confirmedPurchasesCount: confirmedCount,
      },
      coupons: {
        activeCount: activeCouponsCount,
        totalRedemptions: totalRedemptionsCount || 0,
        totalDiscountGrantedUsdt: formatMicro(totalDiscountGrantedMicro),
        mostUsed: mostUsedCoupons,
        recentRedemptions: redemptions || [],
      },
      configHealth,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error fetching admin overview' },
      { status }
    );
  }
}
