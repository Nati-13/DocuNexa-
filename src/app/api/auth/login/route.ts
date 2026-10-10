import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateEmail } from '@/lib/auth';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

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

    const supabase = await createServerSupabaseClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData?.user) {
      const msg = authError?.message || '';
      const lower = msg.toLowerCase();

      // Truthful error reporting: only report "Invalid email or password" on actual credential failure
      if (lower.includes('invalid login credentials') || lower.includes('invalid grant') || lower.includes('user not found')) {
        return secureJsonResponse({ error: 'Invalid email or password.' }, { status: 401 }, requestId);
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
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const { recordAnalyticsEvent } = await import('@/lib/analytics/tracker');
    recordAnalyticsEvent({
      eventType: 'login',
      path: '/login',
      countryCode,
      ip,
      userId: authData.user.id,
    }).catch(() => {});

    return secureJsonResponse({
      success: true,
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
