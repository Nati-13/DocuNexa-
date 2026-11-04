import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { validateEmail, validatePasswordStrength } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/auth/email';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 32 * 1024,
    rateLimitAction: 'auth-signup',
    maxRequests: 10,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: 'Malformed request JSON.' }, { status: 400 }, requestId);
    }

    const { email, password, confirmPassword, termsAccepted, termsVersion } = body;

    if (termsAccepted !== true) {
      return secureJsonResponse(
        { error: 'You must read and agree to the Terms of Service and Privacy Policy to register.' },
        { status: 400 },
        requestId
      );
    }

    if (!email || typeof email !== 'string') {
      return secureJsonResponse({ error: 'A valid email address is required.' }, { status: 400 }, requestId);
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!validateEmail(cleanEmail)) {
      return secureJsonResponse({ error: 'Please enter a valid email address.' }, { status: 400 }, requestId);
    }

    if (!password || typeof password !== 'string') {
      return secureJsonResponse({ error: 'Password is required.' }, { status: 400 }, requestId);
    }

    const strengthCheck = validatePasswordStrength(password);
    if (!strengthCheck.valid) {
      return secureJsonResponse({ error: strengthCheck.message }, { status: 400 }, requestId);
    }

    if (password !== confirmPassword) {
      return secureJsonResponse({ error: 'Passwords do not match.' }, { status: 400 }, requestId);
    }

    // Check server-side Supabase configuration upfront
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      console.error(
        `[Auth Signup Config Error] [Request ID: ${requestId}]: Server-side Supabase configuration missing. ` +
        `Server secret key: ${serviceKey ? 'CONFIGURED' : 'NOT CONFIGURED'}, ` +
        `Supabase URL: ${supabaseUrl ? 'CONFIGURED' : 'NOT CONFIGURED'}`
      );
      return secureJsonResponse(
        {
          error:
            'Server authentication configuration is incomplete. The server-side Supabase secret key (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY) is not configured in the environment. Please contact support.',
          code: 'CONFIG_MISSING',
          requestId,
        },
        { status: 503 },
        requestId
      );
    }

    const admin = createAdminSupabaseClient();

    // 1. Create account server-side via Supabase Auth admin API with email_confirm: true
    // This avoids triggering Supabase's hosted email confirmation emails.
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        accepted_terms: termsAccepted !== false,
        terms_version: termsVersion || '2026.11',
        terms_accepted_at: new Date().toISOString(),
        accepted_privacy: termsAccepted !== false,
        privacy_version: '2026.11',
        privacy_accepted_at: new Date().toISOString(),
      },
    });

    if (createError) {
      const lower = (createError.message || '').toLowerCase();
      const code = (createError as any).code || '';
      if (
        code === 'email_exists' ||
        lower.includes('email_exists') ||
        lower.includes('already registered') ||
        lower.includes('already been registered') ||
        lower.includes('already in use') ||
        lower.includes('already exists') ||
        lower.includes('user already registered')
      ) {
        return secureJsonResponse(
          { error: 'An account with this email address already exists. Please log in instead.' },
          { status: 409 },
          requestId
        );
      }
      return secureJsonResponse({ error: createError.message || 'Registration failed.' }, { status: 400 }, requestId);
    }

    const userId = createData.user?.id;
    if (!userId) {
      return secureJsonResponse({ error: 'Failed to create user account. Please try again.' }, { status: 500 }, requestId);
    }

    // 2. Persist authoritative legal acceptance record into server-managed legal_acceptances table
    const termsVer =
      typeof termsVersion === 'string' && termsVersion.trim()
        ? termsVersion.trim()
        : '2026.11';
    const privacyVer =
      typeof body.privacyVersion === 'string' && body.privacyVersion.trim()
        ? body.privacyVersion.trim()
        : '2026.11';
    const nowIso = new Date().toISOString();

    const { error: acceptanceError } = await admin.from('legal_acceptances').insert({
      user_id: userId,
      terms_version: termsVer,
      privacy_version: privacyVer,
      policy_scope: 'all_terms_and_privacy',
      accepted_at: nowIso,
    });

    if (acceptanceError) {
      console.error(
        `[Auth Signup Legal Consent Error] [Request ID: ${requestId}]: Failed to persist legal acceptance record: ${acceptanceError.message}`
      );
      // Fail-closed protection: attempt best-effort deletion of newly created Auth user
      // Note: Rollback is not guaranteed if Auth service deletion fails, so an operational alert is emitted
      // and secondary defensive neutralization is applied to prevent unconsented access.
      try {
        const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
        if (deleteError) {
          throw deleteError;
        }
      } catch (cleanupErr: any) {
        console.error(
          `[OPERATIONAL ALERT] [CRITICAL] [Request ID: ${requestId}]: Failed to clean up unconsented user ${userId} (${cleanEmail}) after legal acceptance insertion failure: ${cleanupErr?.message || cleanupErr}. Account requires manual administrative deletion.`
        );
        // Secondary defensive neutralization: ban user and set server-managed app_metadata failure flag (cannot be edited by client users)
        try {
          await admin.auth.admin.updateUserById(userId, {
            ban_duration: '876600h', // 100 years
            app_metadata: {
              consent_persistence_failed: true,
              registration_failed: true,
            },
          });
        } catch (banErr: any) {
          console.error(
            `[OPERATIONAL ALERT] [CRITICAL] [Request ID: ${requestId}]: Secondary administrative flagging failed for user ${userId}:`,
            banErr?.message || banErr
          );
        }
      }

      return secureJsonResponse(
        { error: 'Account registration could not be completed at this time. Please try again or contact support.' },
        { status: 500 },
        requestId
      );
    }

    // 3. Ensure initial profile row exists in public.profiles with default free plan
    try {
      await admin.from('profiles').upsert(
        {
          id: userId,
          email: cleanEmail,
          plan: 'free',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch {
      // Trigger handles creation if upsert fails
    }

    // 4. Sign the newly-created user in using the existing SSR Supabase client
    const supabase = await createServerSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    // 5. Send automated welcome email (Non-critical notification, idempotent)
    try {
      const appMeta = createData.user?.app_metadata || {};
      if (!appMeta.welcome_email_sent) {
        const welcomeResult = await sendWelcomeEmail({
          to: cleanEmail,
          requestId,
        });

        if (welcomeResult.success) {
          // Record welcome email sent in server-managed app_metadata only after verified delivery
          await admin.auth.admin.updateUserById(userId, {
            app_metadata: { welcome_email_sent: true },
          });
        } else {
          // SMTP failure remains retryable: do not set welcome_email_sent flag
          console.warn(
            `[Auth Signup Welcome Email] [Request ID: ${requestId}]: Non-critical welcome email dispatch notice: ${welcomeResult.error || 'delivery unconfirmed'}. Flag remains unset for retryability.`
          );
        }
      }
    } catch (emailErr: any) {
      // Non-critical notification failure must never undo registration or throw an unhandled error
      console.warn(
        `[Auth Signup Welcome Email] [Request ID: ${requestId}]: Non-critical welcome email skipped or failed:`,
        emailErr?.message || emailErr
      );
    }

    if (signInError) {
      return secureJsonResponse(
        {
          success: true,
          user: { id: userId, email: cleanEmail, plan: 'free' },
          redirect: '/login',
        },
        { status: 201 },
        requestId
      );
    }

    return secureJsonResponse(
      {
        success: true,
        user: {
          id: userId,
          email: cleanEmail,
          plan: 'free',
        },
        redirect: '/choose-plan',
      },
      { status: 201 },
      requestId
    );
  } catch (err: any) {
    const isConfigError =
      err?.message?.includes('Supabase server secret key is required') ||
      err?.message?.includes('secret key') ||
      err?.message?.includes('configuration');

    if (isConfigError) {
      console.error(
        `[Auth Signup Config Error] [Request ID: ${requestId}]: Server secret key configuration missing: ${err.message}`
      );
      return secureJsonResponse(
        {
          error:
            'Server authentication configuration is incomplete. The server-side Supabase secret key (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY) is not configured in the environment. Please contact support.',
          code: 'CONFIG_MISSING',
          requestId,
        },
        { status: 503 },
        requestId
      );
    }

    console.error(`[Auth Signup Error] [Request ID: ${requestId}]:`, err?.message || err);
    return secureJsonResponse(
      { error: 'An unexpected error occurred during account registration. Please try again.', requestId },
      { status: 500 },
      requestId
    );
  }
}
