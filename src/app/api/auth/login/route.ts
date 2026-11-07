import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateEmail } from '@/lib/auth';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';
import {
  checkAccountLockoutStatus,
  recordFailedLoginAttempt,
  recordSuccessfulLogin,
  SUPPORT_SECURITY_EMAIL,
  TELEGRAM_SUPPORT_BOT_URL,
} from '@/lib/auth/loginSecurity';

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 32 * 1024,
    rateLimitAction: 'auth-login',
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

    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return secureJsonResponse({ error: 'Email and password are required.' }, { status: 400 }, requestId);
    }

    if (!validateEmail(email)) {
      return secureJsonResponse({ error: 'Please enter a valid email address.' }, { status: 400 }, requestId);
    }

    const cleanEmail = email.trim().toLowerCase();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    // 0. Pre-authentication account lockout check
    const lockoutStatus = await checkAccountLockoutStatus(cleanEmail);
    if (lockoutStatus.unavailable) {
      return secureJsonResponse(
        {
          error: 'Authentication security service is temporarily unavailable. Please try again shortly.',
          code: 'SECURITY_CHECK_UNAVAILABLE',
        },
        { status: 503 },
        requestId
      );
    }
    if (lockoutStatus.isLocked) {
      return secureJsonResponse(
        {
          error: 'This account has been locked for security recovery after 5 consecutive failed login attempts. Please contact an administrator or request recovery assistance.',
          code: 'ACCOUNT_LOCKED',
          isLocked: true,
          supportEmail: SUPPORT_SECURITY_EMAIL,
          telegramBotUrl: TELEGRAM_SUPPORT_BOT_URL,
        },
        { status: 403 },
        requestId
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData?.user) {
      const msg = authError?.message || '';
      const lower = msg.toLowerCase();

      // Credential failure: record consecutive failed attempt atomically
      if (lower.includes('invalid login credentials') || lower.includes('invalid grant') || lower.includes('user not found')) {
        const failureResult = await recordFailedLoginAttempt(cleanEmail, ip);

        if ((failureResult.unavailable || failureResult.persistenceFailed) && (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production')) {
          return secureJsonResponse(
            {
              error: 'Authentication security service is temporarily unavailable. Please try again shortly.',
              code: 'SECURITY_CHECK_UNAVAILABLE',
            },
            { status: 503 },
            requestId
          );
        }

        if (failureResult.isLocked) {
          return secureJsonResponse(
            {
              error: 'Account locked for security recovery. Maximum of 5 consecutive failed login attempts reached. Please contact an administrator.',
              code: 'ACCOUNT_LOCKED',
              isLocked: true,
              supportEmail: SUPPORT_SECURITY_EMAIL,
              telegramBotUrl: TELEGRAM_SUPPORT_BOT_URL,
            },
            { status: 403 },
            requestId
          );
        }

        return secureJsonResponse(
          {
            error: 'Invalid email or password. Please verify your credentials and try again.',
            remainingAttempts: failureResult.remainingAttempts,
          },
          { status: 401 },
          requestId
        );
      }

      if (lower.includes('email not confirmed')) {
        return secureJsonResponse(
          {
            error: 'Please confirm your email address before signing in.',
            needsEmailConfirmation: true,
            email: cleanEmail,
          },
          { status: 403 },
          requestId
        );
      }

      if (lower.includes('rate limit') || lower.includes('too many requests')) {
        return secureJsonResponse({ error: 'Too many login attempts. Please wait a moment and try again.' }, { status: 429 }, requestId);
      }

      return secureJsonResponse({ error: msg || 'Authentication failed. Please verify your credentials.' }, { status: 401 }, requestId);
    }

    // 1. Check server-managed app_metadata for administrative blocking (users cannot edit app_metadata)
    const appMeta = authData.user.app_metadata || {};
    if (appMeta.consent_persistence_failed === true || appMeta.registration_failed === true) {
      await supabase.auth.signOut();
      console.error(
        `[OPERATIONAL ALERT] [SECURITY] [Request ID: ${requestId}]: Blocked login attempt for administratively flagged account ${authData.user.id} (${cleanEmail}). Incomplete registration.`
      );
      return secureJsonResponse(
        { error: 'Account registration was incomplete or blocked. Please contact support.' },
        { status: 403 },
        requestId
      );
    }

    // 2. Authoritative consent verification: check public.legal_acceptances
    const { data: legalAcceptance } = await supabase
      .from('legal_acceptances')
      .select('id')
      .eq('user_id', authData.user.id)
      .limit(1)
      .maybeSingle();

    const needsReconsent = !legalAcceptance;

    // Mandatory security invariant: require confirmed durable counter reset before reporting login success
    const resetResult = await recordSuccessfulLogin(cleanEmail);
    if (!resetResult.success) {
      console.error(
        `[SECURITY ALERT] [Request ID: ${requestId}]: Mandatory counter reset failed for ${cleanEmail}:`,
        resetResult.error
      );

      // Sign out the newly authenticated user to prevent session establishment on security failure
      try {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.error(
            `[SECURITY ALERT] [Request ID: ${requestId}]: signOut returned error during security abort:`,
            signOutError.message
          );
        }
      } catch (signOutErr) {
        console.error(`[SECURITY ALERT] [Request ID: ${requestId}]: signOut failed during security abort:`, signOutErr);
      }

      // Return HTTP 503 with generic error message (never expose internal database or RPC details)
      const errorResponse = secureJsonResponse(
        {
          error: 'Authentication security service is temporarily unavailable. Please try again shortly.',
          code: 'SECURITY_CHECK_UNAVAILABLE',
        },
        { status: 503 },
        requestId
      );

      // Invariant: explicitly delete any auth session cookies to guarantee no session remains active
      const cookiesToDelete = new Set<string>();

      // 1. Inspect incoming request Cookie header
      const rawCookieHeader = req.headers.get('cookie') || '';
      if (rawCookieHeader) {
        for (const cookieStr of rawCookieHeader.split(';')) {
          const cookieName = cookieStr.split('=')[0]?.trim();
          if (
            cookieName &&
            (cookieName.includes('sb-') ||
              cookieName.includes('auth') ||
              cookieName.includes('token') ||
              cookieName.includes('session'))
          ) {
            cookiesToDelete.add(cookieName);
          }
        }
      }

      // 2. Inspect next/headers cookieStore if available in request context
      try {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        for (const c of allCookies) {
          if (
            c.name.includes('sb-') ||
            c.name.includes('auth') ||
            c.name.includes('token') ||
            c.name.includes('session')
          ) {
            cookiesToDelete.add(c.name);
          }
        }
      } catch {
        // Outside Next.js request scope fallback
      }

      // 3. Known default Supabase cookie keys
      cookiesToDelete.add('sb-access-token');
      cookiesToDelete.add('sb-refresh-token');
      cookiesToDelete.add('sb-docunexa-auth-token');

      // Set cookie-expiration headers on the response for each authentication cookie
      // Invariant: both Max-Age=0 and past Expires date must be emitted to enforce deletion
      for (const name of cookiesToDelete) {
        errorResponse.cookies.set(name, '', {
          maxAge: 0,
          expires: new Date(0),
          path: '/',
        });
      }

      return errorResponse;
    }

    // Retrieve profile to confirm plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // Record verified successful login event (never on failed attempts)
    const countryCode =
      req.headers.get('x-vercel-ip-country') ||
      req.headers.get('cf-ipcountry') ||
      req.headers.get('x-country') ||
      null;
    const clientIp = ip || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const { recordAnalyticsEvent } = await import('@/lib/analytics/tracker');
    recordAnalyticsEvent({
      eventType: 'login',
      path: '/login',
      countryCode,
      ip: clientIp,
      userId: authData.user.id,
    }).catch(() => {});

    return secureJsonResponse({
      success: true,
      needsConsent: needsReconsent,
      redirect: needsReconsent ? '/accept-terms' : '/account',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        plan: profile?.plan || 'free',
        created_at: authData.user.created_at,
      },
    }, { status: 200 }, requestId);
  } catch (err: any) {
    return secureJsonResponse(
      { error: 'An unexpected error occurred during login. Please try again.' },
      { status: 500 },
      requestId
    );
  }
}
