import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 16 * 1024,
    rateLimitAction: 'accept-terms',
    maxRequests: 10,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    // 1. Authenticate the existing user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return secureJsonResponse(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 },
        requestId
      );
    }

    // 2. Reject if administratively flagged via server-managed app_metadata
    const appMeta = user.app_metadata || {};
    if (appMeta.consent_persistence_failed === true || appMeta.registration_failed === true) {
      return secureJsonResponse(
        { error: 'Account registration was incomplete or blocked. Please contact support.' },
        { status: 403 },
        requestId
      );
    }

    // 3. Validate explicit consent payload
    let body: any;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: 'Malformed request payload.' }, { status: 400 }, requestId);
    }

    const { termsAccepted, privacyAccepted, termsVersion, privacyVersion } = body;

    if (termsAccepted !== true || privacyAccepted !== true) {
      return secureJsonResponse(
        { error: 'You must explicitly review and accept both the Terms of Service and Privacy Policy to continue.' },
        { status: 400 },
        requestId
      );
    }

    const termsVer =
      typeof termsVersion === 'string' && termsVersion.trim()
        ? termsVersion.trim()
        : '2026.11';
    const privacyVer =
      typeof privacyVersion === 'string' && privacyVersion.trim()
        ? privacyVersion.trim()
        : '2026.11';
    const nowIso = new Date().toISOString();

    // 4. Save the acceptance using trusted server-side code (service_role)
    const admin = createAdminSupabaseClient();
    const { error: insertError } = await admin.from('legal_acceptances').insert({
      user_id: user.id,
      terms_version: termsVer,
      privacy_version: privacyVer,
      policy_scope: 'all_terms_and_privacy',
      accepted_at: nowIso,
    });

    if (insertError) {
      console.error(
        `[Accept-Terms Error] [Request ID: ${requestId}]: Failed to persist legal acceptance for user ${user.id}: ${insertError.message}`
      );
      // If database persistence fails, keep restricted access and display a recoverable error
      return secureJsonResponse(
        { error: 'Unable to save legal acceptance at this time. Please try again or contact support.' },
        { status: 500 },
        requestId
      );
    }

    // Grant normal access after successful persistence
    const redirectUrl =
      typeof body.redirect === 'string' && body.redirect.startsWith('/') && !body.redirect.startsWith('//')
        ? body.redirect
        : '/account';

    return secureJsonResponse(
      {
        success: true,
        message: 'Legal terms acceptance recorded successfully.',
        redirect: redirectUrl,
      },
      { status: 200 },
      requestId
    );
  } catch (err: any) {
    console.error(`[Accept-Terms Error] [Request ID: ${requestId}]:`, err?.message || err);
    return secureJsonResponse(
      { error: 'An unexpected error occurred while saving legal acceptance. Please try again.', requestId },
      { status: 500 },
      requestId
    );
  }
}

