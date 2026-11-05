import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { guardApiRequest } from '@/lib/security/apiGuard';
import {
  listLockedAccounts,
  adminUnlockAccount,
} from '@/lib/auth/loginSecurity';
import { requestPasswordReset } from '@/lib/auth/passwordReset';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { errorResponse } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
    rateLimitAction: 'admin-locked-accounts-list',
    maxRequests: 60,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    await requireAdmin();
    const lockedAccounts = await listLockedAccounts();

    return NextResponse.json({
      success: true,
      lockedAccounts,
      count: lockedAccounts.length,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error fetching locked accounts' },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  const { errorResponse } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    rateLimitAction: 'admin-locked-accounts-action',
    maxRequests: 30,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { profile: adminProfile } = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const { action, email, reason } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid customer email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (action === 'unlock') {
      await adminUnlockAccount(cleanEmail, adminProfile.id, reason || 'Admin manual account unlock');
      return NextResponse.json({
        success: true,
        message: `Account ${cleanEmail} has been unlocked successfully.`,
      });
    }

    if (action === 'trigger_reset') {
      // 1. Dispatch secure password recovery email directly to customer
      // (NEVER retrieve, display, or generate a plaintext password for admin)
      const resetResult = await requestPasswordReset(cleanEmail, 'admin-lockout-recovery');

      if (!resetResult.success) {
        const admin = createAdminSupabaseClient();
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://docunexa.pro.et';
        const { error: sbError } = await admin.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${siteUrl}/reset-password`,
        });

        if (sbError) {
          return NextResponse.json(
            { error: resetResult.error || sbError.message || 'Failed to dispatch reset email.' },
            { status: 502 }
          );
        }
      }

      // 2. Unlock the account so customer can sign in after completing reset
      await adminUnlockAccount(cleanEmail, adminProfile.id, reason || 'Admin triggered password reset email');

      // 3. Log audit event
      await logAdminAction({
        adminUserId: adminProfile.id,
        action: 'user_password_recovery_initiated' as any,
        reason: reason || 'Admin initiated password reset for locked account',
        metadata: {
          targetEmail: cleanEmail,
          adminEmail: adminProfile.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Secure password reset instructions sent to ${cleanEmail} and lockout cleared.`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: "unlock", "trigger_reset".' },
      { status: 400 }
    );
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error processing account lockout action' },
      { status }
    );
  }
}

