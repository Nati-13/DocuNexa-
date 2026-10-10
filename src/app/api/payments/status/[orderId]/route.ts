import { getCurrentProfile, createServerSupabaseClient } from '@/lib/supabase/server';
import { formatPaymentAmount } from '@/lib/payments/format';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return secureJsonResponse({ error: 'Unauthorized' }, { status: 401 }, requestId);
    }

    const { orderId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: order, error } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      return secureJsonResponse({ error: 'Payment order not found' }, { status: 404 }, requestId);
    }

    // Security: Only the user who created the order can access its status
    if (order.user_id !== profile.id) {
      return secureJsonResponse({ error: 'Forbidden' }, { status: 403 }, requestId);
    }

    return secureJsonResponse({
      orderId: order.order_id,
      status: order.status,
      amount: formatPaymentAmount(order.payment_amount_usdt),
      currency: order.currency,
      network: order.network,
      destinationAddress: order.destination_address,
      userPlan: profile.plan,
      isAdFree: profile.plan === 'ad_free',
      confirmedAt: order.confirmed_at,
      txId: order.tx_id,
      expiresAt: order.expires_at,
    }, { status: 200 }, requestId);
  } catch (err: any) {
    return secureJsonResponse(
      { error: err.message || 'Error checking payment status' },
      { status: 500 },
      requestId
    );
  }
}
