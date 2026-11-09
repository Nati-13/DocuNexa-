import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile: adminProfile, adminUserId } = await requireAdmin();
    const { id: paymentId } = await params;

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action; // 'approve' | 'reject'
    const reason = (body?.reason || '').trim();
    const txIdEvidence = (body?.txId || body?.evidence || '').trim();
    const bybitDepositIdEvidence = (body?.bybitDepositId || '').trim();
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
      // Require payment evidence (either provided in review or previously recorded on order)
      const effectiveTxId = txIdEvidence || order.tx_id || null;
      const effectiveDepositId = bybitDepositIdEvidence || order.bybit_deposit_id || null;

      if (!effectiveTxId && !effectiveDepositId) {
        return NextResponse.json(
          {
            error: 'Payment evidence (transaction ID or Bybit deposit ID) is required to approve an order.',
            code: 'MISSING_PAYMENT_EVIDENCE',
          },
          { status: 400 }
        );
      }

      // Enforce at least 10 characters justification for exceptional order statuses
      const isExceptionalStatus = ['amount_mismatch', 'expired', 'cancelled'].includes(order.status);
      if (isExceptionalStatus && (!reason || reason.length < 10)) {
        return NextResponse.json(
          {
            error: `Approving an order in '${order.status}' status requires a detailed justification reason of at least 10 characters.`,
            code: 'INSUFFICIENT_JUSTIFICATION',
          },
          { status: 400 }
        );
      }

      // Execute the atomic PostgreSQL transaction RPC.
      // Strictly NO fallback to sequential multi-request updates.
      const { data, error: rpcErr } = await admin.rpc('admin_approve_payment_atomic', {
        p_payment_id: order.id,
        p_admin_user_id: adminUserId,
        p_tx_id: effectiveTxId,
        p_bybit_deposit_id: effectiveDepositId,
        p_review_notes: reason,
      });

      if (rpcErr) {
        console.error('[AdminPaymentReview] Atomic approval RPC failed:', rpcErr);
        return NextResponse.json(
          {
            error: `Atomic payment approval failed: ${rpcErr.message}. Migration 20261108200000_subscription_plans_and_entitlements must be applied to the database.`,
            code: rpcErr.code || 'RPC_EXECUTION_FAILED',
          },
          { status: 500 }
        );
      }

      if (!data?.success) {
        const statusCode = data?.code === 'NOT_FOUND' ? 404 : 409;
        return NextResponse.json(
          {
            error: data?.error || 'Payment approval was rejected by atomic transaction constraints.',
            code: data?.code || 'APPROVAL_REJECTED',
          },
          { status: statusCode }
        );
      }

      const isIdempotentRetry = Boolean(data.already_confirmed);
      const msg = isIdempotentRetry
        ? `Order ${order.order_id} was already confirmed. Entitlements and original timestamp preserved.`
        : `Order ${order.order_id} manually approved. User upgraded to ${data.plan}.`;

      return NextResponse.json({
        success: true,
        message: msg,
        status: 'confirmed',
        alreadyConfirmed: isIdempotentRetry,
        plan: data.plan,
        subscriptionExpiresAt: data.subscription_expires_at,
      });
    } else {
      // Manual rejection
      const { error: rejectErr } = await admin
        .from('payment_orders')
        .update({
          failure_reason: `Rejected by admin: ${reason}`,
          updated_at: nowIso,
        })
        .eq('id', order.id);

      if (rejectErr) {
        return NextResponse.json(
          { error: `Failed to reject payment order: ${rejectErr.message}` },
          { status: 500 }
        );
      }

      await logAdminAction({
        adminUserId,
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
