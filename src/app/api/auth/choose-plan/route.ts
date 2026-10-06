import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = body;

    if (plan === 'free') {
      const admin = createAdminSupabaseClient();
      await admin
        .from('profiles')
        .update({ plan: 'free', updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      return NextResponse.json({
        success: true,
        plan: 'free',
        redirect: '/tools',
      });
    }

    if (plan === 'ad_free') {
      return NextResponse.json({
        success: true,
        plan: profile.plan,
        redirect: '/account?checkout=ad_free',
      });
    }

    return NextResponse.json({ error: 'Invalid plan selection' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error processing plan choice' },
      { status: 500 }
    );
  }
}
