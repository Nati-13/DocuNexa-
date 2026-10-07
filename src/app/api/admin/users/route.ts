import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { parseExactUsdt } from '@/lib/payments/bybit';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
    rateLimitAction: 'admin-users',
    maxRequests: 60,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    await requireAdmin();
    const admin = createAdminSupabaseClient();

    const searchParams = req.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim();
    const plan = searchParams.get('plan');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = admin
      .from('profiles')
      .select('id, email, plan, created_at, updated_at', { count: 'exact' });

    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    if (plan && (plan === 'free' || plan === 'ad_free')) {
      query = query.eq('plan', plan);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: users, count: totalCount, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userList = users || [];
    const userIds = userList.map((u) => u.id);

    // Fetch related payment orders for these users to calculate spend & orders count
    const { data: userOrders } = await admin
      .from('payment_orders')
      .select('user_id, status, payment_amount_usdt, received_amount, final_amount_usdt')
      .in('user_id', userIds);

    // Fetch related coupon redemptions count
    const { data: userRedemptions } = await admin
      .from('coupon_redemptions')
      .select('user_id')
      .in('user_id', userIds);

    const spendMap: Record<string, bigint> = {};
    const ordersCountMap: Record<string, number> = {};
    const redemptionsCountMap: Record<string, number> = {};

    for (const ord of userOrders || []) {
      ordersCountMap[ord.user_id] = (ordersCountMap[ord.user_id] || 0) + 1;
      if (ord.status === 'confirmed') {
        const amt = ord.received_amount || ord.final_amount_usdt || ord.payment_amount_usdt;
        const parsed = parseExactUsdt(amt);
        if (parsed.valid) {
          spendMap[ord.user_id] = (spendMap[ord.user_id] || 0n) + parsed.microUnits;
        }
      }
    }

    for (const r of userRedemptions || []) {
      redemptionsCountMap[r.user_id] = (redemptionsCountMap[r.user_id] || 0) + 1;
    }

    const enrichedUsers = userList.map((u) => {
      const spendMicro = spendMap[u.id] || 0n;
      const spendFormatted = (Number(spendMicro) / 1000000).toFixed(2);
      return {
        id: u.id,
        email: u.email,
        plan: u.plan,
        createdAt: u.created_at,
        paymentsCount: ordersCountMap[u.id] || 0,
        totalSpendUsdt: spendFormatted,
        couponRedemptionsCount: redemptionsCountMap[u.id] || 0,
      };
    });

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error fetching users list' },
      { status }
    );
  }
}
