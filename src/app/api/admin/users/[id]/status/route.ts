import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { guardApiRequest } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    rateLimitAction: 'admin-user-status',
    maxRequests: 30,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { profile: adminProfile } = await requireAdmin();
    const { id: targetUserId } = await params;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action; // 'suspend' | 'restore'
    const reason = (body?.reason || '').trim();
    const confirmed = Boolean(body?.confirm);

    if (action !== 'suspend' && action !== 'restore') {
      return NextResponse.json(
        { error: "Invalid action. Must be 'suspend' or 'restore'." },
        { status: 400 }
      );
    }

    if (!confirmed) {
      return NextResponse.json(
        { error: 'Explicit confirmation is required for account status changes.' },
        { status: 400 }
      );
    }

    if (!reason || reason.length < 5) {
      return NextResponse.json(
        { error: 'A documented justification of at least 5 characters is required.' },
        { status: 400 }
      );
    }

    // Safety check: Prevent admin from suspending themselves
    if (adminProfile.id === targetUserId && action === 'suspend') {
      return NextResponse.json(
        { error: 'Administrators cannot suspend their own active administrative account.' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: targetUser, error: fetchErr } = await admin
      .from('profiles')
      .select('id, email, is_suspended')
      .eq('id', targetUserId)
      .single();

    if (fetchErr || !targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }

    const shouldSuspend = action === 'suspend';
    const nowIso = new Date().toISOString();

    // 1. Update public.profiles is_suspended
    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        is_suspended: shouldSuspend,
        updated_at: nowIso,
      })
      .eq('id', targetUserId);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update user profile status.' }, { status: 500 });
    }

    // 2. Synchronize with Supabase Auth ban state
    try {
      await admin.auth.admin.updateUserById(targetUserId, {
        ban_duration: shouldSuspend ? '876600h' : 'none',
      });
    } catch (authBanErr) {
      console.warn('[Admin User Status]: Supabase Auth ban sync warning:', authBanErr);
    }

    // 3. Write immutable audit log
    await logAdminAction({
      adminUserId: adminProfile.id,
      action: shouldSuspend ? 'user_suspended' : 'user_restored',
      targetUserId,
      reason,
      metadata: {
        targetEmail: targetUser.email,
        adminEmail: adminProfile.email,
        action,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.email} has been successfully ${shouldSuspend ? 'suspended' : 'restored'}.`,
      status: shouldSuspend ? 'suspended' : 'active',
      isSuspended: shouldSuspend,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error updating user status' },
      { status }
    );
  }
}
