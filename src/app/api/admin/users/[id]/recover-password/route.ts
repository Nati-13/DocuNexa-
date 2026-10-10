import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { guardApiRequest } from '@/lib/security/apiGuard';
import { requestPasswordReset } from '@/lib/auth/passwordReset';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    rateLimitAction: 'admin-recover-pwd',
    maxRequests: 20,
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
    const confirmed = Boolean(body?.confirm);

    if (!confirmed) {
      return NextResponse.json(
        { error: 'Explicit confirmation is required to initiate password recovery.' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: targetUser, error: fetchErr } = await admin
      .from('profiles')
      .select('id, email')
      .eq('id', targetUserId)
      .single();

    if (fetchErr || !targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }

    // Trigger existing secure recovery workflow
    const resetResult = await requestPasswordReset(targetUser.email, 'admin-console');

    if (!resetResult.success) {
      // Fallback directly to Supabase Auth reset email if configured
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://docunexa.pro.et';
      const { error: sbError } = await admin.auth.resetPasswordForEmail(targetUser.email, {
        redirectTo: `${siteUrl}/reset-password`,
      });

      if (sbError) {
        return NextResponse.json(
          { error: resetResult.error || sbError.message || 'Failed to dispatch recovery email.' },
          { status: 502 }
        );
      }
    }

    // Append-only audit log (strictly zero tokens or codes recorded)
    await logAdminAction({
      adminUserId: adminProfile.id,
      action: 'user_password_recovery_initiated',
      targetUserId,
      reason: 'Admin initiated password reset email dispatch',
      metadata: {
        targetEmail: targetUser.email,
        adminEmail: adminProfile.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password recovery instructions have been securely dispatched to ${targetUser.email}.`,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error initiating password recovery' },
      { status }
    );
  }
}
