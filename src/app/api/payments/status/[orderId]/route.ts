import { NextResponse } from 'next/server';
import { getCurrentProfile, createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: order, error } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Payment order not found' }, { status: 404 });
    }

    // Security: Only the user who created the order can access its status
    if (order.user_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      orderId: order.order_id,
      status: order.status,
      amount: order.payment_amount_usdt,
      currency: order.currency,
      network: order.network,
      destinationAddress: order.destination_address,
      userPlan: profile.plan,
      isAdFree: profile.plan === 'ad_free',
      confirmedAt: order.confirmed_at,
      txId: order.tx_id,
      expiresAt: order.expires_at,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error checking payment status' },
      { status: 500 }
    );
  }
}
