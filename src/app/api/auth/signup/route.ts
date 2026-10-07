import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { validateEmail, validatePasswordStrength } from '@/lib/auth';
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

    const { email, password, confirmPassword } = body;

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

    const supabase = await createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    // 1. Create or register user via Supabase Auth
    // Use admin.auth.admin to guarantee email is confirmed so user is immediately active
    let userId: string | null = null;

    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
    });

    if (createError) {
      const lower = createError.message.toLowerCase();
      if (lower.includes('already registered') || lower.includes('already in use') || lower.includes('user already exists')) {
        return secureJsonResponse(
          { error: 'An account with this email address already exists. Please log in instead.' },
          { status: 409 },
          requestId
        );
      }
      // If admin createUser is restricted, fallback to standard signUp
      const { data: fallbackAuth, error: fallbackError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (fallbackError) {
        const status = fallbackError.message.toLowerCase().includes('already registered') ? 409 : 400;
        return secureJsonResponse({ error: fallbackError.message || 'Registration failed.' }, { status }, requestId);
      }
      userId = fallbackAuth.user?.id || null;
    } else {
      userId = createData.user?.id || null;
    }

    if (!userId) {
      return secureJsonResponse({ error: 'Failed to create user account. Please try again.' }, { status: 500 }, requestId);
    }

    // 2. Automatically establish an active session so the user remains signed in for plan selection
    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    // 3. Ensure profile row exists in public.profiles with default free plan
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

    return secureJsonResponse(
      {
        success: true,
        user: {
          id: userId,
          email: cleanEmail,
          plan: 'free',
          created_at: sessionData?.user?.created_at || new Date().toISOString(),
        },
        redirect: '/choose-plan',
      },
      { status: 201 },
      requestId
    );
  } catch (err: any) {
    return secureJsonResponse(
      { error: 'An unexpected error occurred during account registration.' },
      { status: 500 },
      requestId
    );
  }
}
