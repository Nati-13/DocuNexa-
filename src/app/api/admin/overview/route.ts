import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getBybitConfig, parseExactUsdt } from '@/lib/payments/bybit';
import { guardApiRequest } from '@/lib/security/apiGuard';
import { getAnalyticsSummary } from '@/lib/analytics/tracker';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { errorResponse } = await guardApiRequest(req, {
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

    // 1. Users metrics & registration trends
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

    const { count: suspendedUsers } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_suspended', true);

    const now = new Date();
    const startOfTodayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeekIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startOfMonthIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { count: signupsToday } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfTodayIso);

    const { count: signupsThisWeek } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfWeekIso);

    // Fetch user creation dates for the last 30 days to build registration trends
    const { data: recentProfiles } = await admin
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgoIso)
      .order('created_at', { ascending: true });

    const registrationBuckets: Record<string, number> = {};
    // Seed the last 14 days with 0
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      registrationBuckets[d] = 0;
    }
    for (const p of recentProfiles || []) {
      const day = p.created_at ? p.created_at.slice(0, 10) : '';
      if (day && registrationBuckets[day] !== undefined) {
        registrationBuckets[day] = (registrationBuckets[day] || 0) + 1;
      }
    }
    const registrationTrends = Object.entries(registrationBuckets).map(([date, count]) => ({
      date,
      count,
    }));

    // 2. Payments & Verified Revenue Metrics
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

    // Daily revenue buckets for the last 14 days
    const dailyRevenueBuckets: Record<string, { microUnits: bigint; count: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      dailyRevenueBuckets[d] = { microUnits: 0n, count: 0 };
    }

    for (const ord of orders) {
      if (ord.status === 'confirmed') {
        confirmedCount++;
        const revAmount = ord.received_amount || ord.final_amount_usdt || ord.payment_amount_usdt;
        const parsedRev = parseExactUsdt(revAmount);
        if (parsedRev.valid) {
          totalRevenueMicro += parsedRev.microUnits;
          const confDate = (ord.confirmed_at || ord.created_at || '').slice(0, 10);
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

          if (dailyRevenueBuckets[confDate]) {
            dailyRevenueBuckets[confDate].microUnits += parsedRev.microUnits;
            dailyRevenueBuckets[confDate].count += 1;
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

    const dailyRevenueTrends = Object.entries(dailyRevenueBuckets).map(([date, bucket]) => ({
      date,
      currency: 'USDT',
      amountUsdt: formatMicro(bucket.microUnits),
      count: bucket.count,
    }));

    // Manually reviewed payments count from audit logs
    const { count: manuallyReviewedCount } = await admin
      .from('admin_audit_logs')
      .select('*', { count: 'exact', head: true })
      .in('action', ['payment_manually_approved', 'payment_manually_rejected', 'payment_reviewed']);

    // 3. Analytics metrics (real data from analytics tracker & DB)
    const analyticsSummary = await getAnalyticsSummary(30);

    // 4. Coupons metrics
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

    // 5. Configuration health (strictly no secrets exposed)
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
        suspended: suspendedUsers || 0,
        expiredEntitlements: 0, // Ad-free plan is lifetime access; 0 expired entitlements
        signupsToday: signupsToday || 0,
        signupsThisWeek: signupsThisWeek || 0,
        registrationTrends,
        dau: analyticsSummary.dau,
        wau: analyticsSummary.wau,
        mau: analyticsSummary.mau,
        successfulLogins: analyticsSummary.successfulLogins,
      },
      analytics: {
        currentVisitors: analyticsSummary.activeVisitorsLast15m,
        totalPageViews: analyticsSummary.totalPageViews,
        uniqueVisitors: analyticsSummary.uniqueVisitors,
        countriesCount: analyticsSummary.countries.length,
        topCountries: analyticsSummary.countries.slice(0, 5),
        popularPages: analyticsSummary.popularPages.slice(0, 5),
        trafficTrends: analyticsSummary.dailyTrends.slice(-14),
      },
      payments: {
        totalConfirmed: confirmedCount,
        pending: pendingCount,
        expired: expiredCount,
        latePayments: lateCount,
        amountMismatches: amountMismatchCount,
        manuallyReviewed: manuallyReviewedCount || 0,
      },
      revenue: {
        currency: 'USDT',
        totalRevenueUsdt: formatMicro(totalRevenueMicro),
        revenueTodayUsdt: formatMicro(revenueTodayMicro),
        revenueThisWeekUsdt: formatMicro(revenueWeekMicro),
        revenueThisMonthUsdt: formatMicro(revenueMonthMicro),
        confirmedPurchasesCount: confirmedCount,
        dailyRevenueTrends,
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
