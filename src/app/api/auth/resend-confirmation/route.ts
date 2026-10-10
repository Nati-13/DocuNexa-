import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateEmail } from '@/lib/auth';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

function getValidatedRedirectUrl(req: Request): string {
  const defaultSiteUrl = 'https://docunexa.pro.et';
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    defaultSiteUrl;

  const allowedOrigins = new Set<string>();

  try {
    allowedOrigins.add(new URL(configuredSiteUrl).origin);
  } catch {}
  allowedOrigins.add(defaultSiteUrl);

  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://127.0.0.1:3000');
  }

  const reqOrigin = req.headers.get('origin');
  let targetOrigin = defaultSiteUrl;

  if (reqOrigin) {
    try {
      const parsedOrigin = new URL(reqOrigin).origin;
      if (allowedOrigins.has(parsedOrigin)) {
        targetOrigin = parsedOrigin;
      }
    } catch {}
  } else {
    try {
      targetOrigin = new URL(configuredSiteUrl).origin;
    } catch {
      targetOrigin = defaultSiteUrl;
    }
  }

  return `${targetOrigin}/auth/callback?next=/choose-plan`;
}

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 16 * 1024,
    rateLimitAction: 'auth-resend-confirm',
    maxRequests: 5,
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

    const { email } = body;
    if (!email || typeof email !== 'string') {
      return secureJsonResponse({ error: 'A valid email address is required.' }, { status: 400 }, requestId);
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      return secureJsonResponse({ error: 'Please enter a valid email address.' }, { status: 400 }, requestId);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !anonKey) {
      console.error(
        `[Auth Resend Confirmation Config Error] [Request ID: ${requestId}]: Client Supabase configuration missing.`
      );
      return secureJsonResponse(
        {
          error: 'Authentication service is temporarily unavailable. Please try again later.',
          code: 'CONFIG_MISSING',
          requestId,
        },
        { status: 503 },
        requestId
      );
    }

    const supabase = await createServerSupabaseClient();
    const emailRedirectTo = getValidatedRedirectUrl(req);

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo,
      },
    });

    if (resendError) {
      const msg = resendError.message || '';
      const lower = msg.toLowerCase();
      const status = (resendError as any)?.status || 500;
      const code = (resendError as any)?.code || 'unknown';

      // Log safe diagnostic information only — never log tokens, passwords, or keys
      console.error(
        `[Auth Resend Confirmation Error] [Request ID: ${requestId}]: code=${code}, status=${status}, message=${msg}`
      );

      // Handle provider rate limiting
      if (
        status === 429 ||
        lower.includes('rate limit') ||
        lower.includes('too many requests') ||
        lower.includes('security purposes')
      ) {
        return secureJsonResponse(
          {
            error: 'Too many requests. Please wait a moment before trying again.',
            code: 'RATE_LIMITED',
            requestId,
          },
          { status: 429 },
          requestId
        );
      }

      // Truthful generic retry message when provider fails — preserves privacy (no account enumeration)
      return secureJsonResponse(
        {
          error: 'Unable to resend confirmation email at this time. Please try again later.',
          code: 'SERVICE_UNAVAILABLE',
          requestId,
        },
        { status: 503 },
        requestId
      );
    }

    // Success response only when accepted by Supabase
    return secureJsonResponse(
      {
        success: true,
        message: 'If an unconfirmed account exists for this email, a confirmation link has been sent.',
      },
      { status: 200 },
      requestId
    );
  } catch (err: any) {
    console.error(
      `[Auth Resend Confirmation Exception] [Request ID: ${requestId}]: ${err?.message || 'unknown error'}`
    );
    return secureJsonResponse(
      {
        error: 'Unable to process confirmation email request at this time. Please try again later.',
        requestId,
      },
      { status: 500 },
      requestId
    );
  }
}

