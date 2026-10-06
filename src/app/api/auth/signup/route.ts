import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { validateEmail, validatePasswordStrength } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, confirmPassword } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    const strengthCheck = validatePasswordStrength(password);
    if (!strengthCheck.valid) {
      return NextResponse.json({ error: strengthCheck.message }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    // Sign up user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      const status = authError.message.toLowerCase().includes('already registered') ? 409 : 400;
      return NextResponse.json(
        { error: authError.message || 'Registration failed.' },
        { status }
      );
    }

    const user = authData.user;
    if (!user) {
      return NextResponse.json({ error: 'Failed to create user account.' }, { status: 500 });
    }

    // Ensure profile row exists in public.profiles with default free plan
    try {
      await admin.from('profiles').upsert(
        {
          id: user.id,
          email: user.email || email.trim().toLowerCase(),
          plan: 'free',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch {
      // Trigger handles creation if upsert fails
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          plan: 'free',
          created_at: user.created_at,
        },
        redirect: '/choose-plan',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'An error occurred during account registration.' },
      { status: 500 }
    );
  }
}
