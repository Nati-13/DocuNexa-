import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { PaymentOrderStatus, PaymentNetwork } from '@/lib/supabase/types';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
    rateLimitAction: 'admin-payments',
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
    const status = searchParams.get('status');
    const network = searchParams.get('network');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = admin
      .from('payment_orders')
      .select('*, profiles:user_id (id, email)', { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status as PaymentOrderStatus);
    }

    if (network && network !== 'all') {
      query = query.eq('network', network as PaymentNetwork);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    if (search) {
      // Support search by order_id or tx_id
      query = query.or(`order_id.ilike.%${search}%,tx_id.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: orders, count: totalCount, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedOrders = (orders || []).map((o: any) => ({
      id: o.id,
      orderId: o.order_id,
      userId: o.user_id,
      userEmail: o.profiles?.email || 'Unknown User',
      product: o.product,
      originalAmountUsd: o.original_amount_usd || '2.00',
      couponCode: o.coupon_code || null,
      discountType: o.discount_type || null,
      discountAmountUsdt: o.discount_amount_usdt || '0.000000',
      finalAmountUsdt: o.final_amount_usdt || o.payment_amount_usdt,
      paymentAmountUsdt: o.payment_amount_usdt,
      receivedAmount: o.received_amount || null,
      status: o.status,
      network: o.network,
      currency: o.currency,
      destinationAddress: o.destination_address,
      txId: o.tx_id || null,
      bybitDepositId: o.bybit_deposit_id || null,
      confirmations: o.confirmations || null,
      failureReason: o.failure_reason || null,
      createdAt: o.created_at,
      expiresAt: o.expires_at,
      detectedAt: o.detected_at,
      confirmedAt: o.confirmed_at,
    }));

    return NextResponse.json({
      success: true,
      payments: formattedOrders,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (err: any) {
    const s = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error fetching payments' },
      { status: s }
    );
  }
}
