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
    const { id: targetUserId } = await params;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = (body?.reason || '').trim();
    const confirmed = Boolean(body?.confirm);

    if (!confirmed) {
      return NextResponse.json(
        { error: 'Explicit confirmation is required to manually revoke Ad-Free.' },
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
    const { data: targetUser, error: fetchErr } = await admin
      .from('profiles')
      .select('id, email, plan')
      .eq('id', targetUserId)
      .single();

    if (fetchErr || !targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }

    if (targetUser.plan === 'free') {
      return NextResponse.json(
        { message: 'User already has Free status.', plan: 'free' },
        { status: 200 }
      );
    }

    const previousPlan = targetUser.plan;
    const nowIso = new Date().toISOString();

    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        plan: 'free',
        updated_at: nowIso,
      })
      .eq('id', targetUserId);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update user plan.' }, { status: 500 });
    }

    // Append-only audit log
    await logAdminAction({
      adminUserId: adminProfile.id,
      action: 'manual_revoke_ad_free',
      targetUserId,
      reason,
      metadata: {
        targetEmail: targetUser.email,
        adminEmail: adminProfile.email,
        previousPlan,
        newPlan: 'free',
        source: 'manual_admin_revoke',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully revoked Ad-Free status from ${targetUser.email}.`,
      plan: 'free',
      previousPlan,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error revoking Ad-Free entitlement' },
      { status }
    );
  }
}
