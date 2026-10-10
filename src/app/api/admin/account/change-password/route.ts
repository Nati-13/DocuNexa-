import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { guardApiRequest } from '@/lib/security/apiGuard';
import { validatePasswordStrength } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { errorResponse } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    rateLimitAction: 'admin-change-password',
    maxRequests: 10,
    windowSeconds: 300,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { profile: adminProfile } = await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;
    const confirmPassword = body?.confirmPassword;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Current password is required.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'New password is required.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation do not match.' },
        { status: 400 }
      );
    }

    // Validate password strength (min 8 chars, mixed case, number)
    const strengthResult = validatePasswordStrength(newPassword);
    if (!strengthResult.valid) {
      return NextResponse.json(
        { error: strengthResult.message || 'Password does not meet security requirements.' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();

    // Verify current password against Supabase Auth
    const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
      email: adminProfile.email,
      password: currentPassword,
    });

    if (signInError || !signInData.user) {
      return NextResponse.json(
        { error: 'Current password verification failed. Please check your current password.' },
        { status: 401 }
      );
    }

    // Update administrator password in Supabase Auth
    const { error: updateError } = await admin.auth.admin.updateUserById(adminProfile.id, {
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password.' },
        { status: 500 }
      );
    }

    // Append-only audit log (strictly zero passwords or secrets logged)
    await logAdminAction({
      adminUserId: adminProfile.id,
      action: 'admin_password_changed',
      targetUserId: adminProfile.id,
      reason: 'Administrator self-initiated password rotation',
      metadata: {
        adminEmail: adminProfile.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Administrator password successfully updated.',
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error updating administrator password' },
      { status }
    );
  }
}
