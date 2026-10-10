import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile: adminProfile } = await requireAdmin();
    const { id: paymentId } = await params;

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action; // 'approve' | 'reject'
    const reason = (body?.reason || '').trim();
    const txIdEvidence = (body?.txId || body?.evidence || '').trim();
    const confirmed = Boolean(body?.confirm);

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    if (!confirmed) {
      return NextResponse.json(
        { error: 'Explicit confirmation is required to complete payment review.' },
        { status: 400 }
      );
    }

    if (!reason || reason.length < 5) {
      return NextResponse.json(
        { error: 'A documented justification reason of at least 5 characters is required.' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: order, error: orderErr } = await admin
      .from('payment_orders')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Payment order not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    if (action === 'approve') {
      // Manual approval: Mark payment confirmed, record tx evidence, upgrade user
      const effectiveTxId = txIdEvidence || order.tx_id || `MANUAL-${Date.now()}`;

      await admin
        .from('payment_orders')
        .update({
          status: 'confirmed',
          confirmed_at: nowIso,
          tx_id: effectiveTxId,
          received_amount: order.received_amount || order.payment_amount_usdt,
          failure_reason: null,
          updated_at: nowIso,
        })
        .eq('id', order.id);

      // Elevate target user to ad_free
      await admin
        .from('profiles')
        .update({
          plan: 'ad_free',
          updated_at: nowIso,
        })
        .eq('id', order.user_id);

      // Record audit log
      await logAdminAction({
        adminUserId: adminProfile.id,
        action: 'payment_manually_approved',
        targetUserId: order.user_id,
        targetPaymentId: order.id,
        reason,
        metadata: {
          orderId: order.order_id,
          network: order.network,
          previousStatus: order.status,
          paymentAmountUsdt: order.payment_amount_usdt,
          evidenceTxId: effectiveTxId,
          adminEmail: adminProfile.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Order ${order.order_id} manually approved. User upgraded to Ad-Free.`,
        status: 'confirmed',
      });
    } else {
      // Manual rejection
      await admin
        .from('payment_orders')
        .update({
          failure_reason: `Rejected by admin: ${reason}`,
          updated_at: nowIso,
        })
        .eq('id', order.id);

      await logAdminAction({
        adminUserId: adminProfile.id,
        action: 'payment_manually_rejected',
        targetUserId: order.user_id,
        targetPaymentId: order.id,
        reason,
        metadata: {
          orderId: order.order_id,
          previousStatus: order.status,
          adminEmail: adminProfile.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Order ${order.order_id} review rejected.`,
        status: order.status,
      });
    }
  } catch (err: any) {
    const s = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error processing payment review' },
      { status: s }
    );
  }
}
