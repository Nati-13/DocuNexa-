import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: profile.id,
        email: profile.email,
        plan: profile.plan,
        created_at: profile.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: false, user: null, error: err.message },
      { status: 500 }
    );
  }
}
