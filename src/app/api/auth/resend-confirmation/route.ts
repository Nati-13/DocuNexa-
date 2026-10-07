import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateEmail } from '@/lib/auth';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

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

    const supabase = await createServerSupabaseClient();
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://docunexa.pro.et';

    await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/choose-plan`,
      },
    });

    // Generic safe response to prevent email enumeration
    return secureJsonResponse(
      {
        success: true,
        message: 'If an unconfirmed account exists for this email, a confirmation link has been sent.',
      },
      { status: 200 },
      requestId
    );
  } catch {
    return secureJsonResponse(
      {
        success: true,
        message: 'If an unconfirmed account exists for this email, a confirmation link has been sent.',
      },
      { status: 200 },
      requestId
    );
  }
}
