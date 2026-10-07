import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/choose-plan';

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        // Ensure profile row exists in public.profiles without duplicate creation
        try {
          const admin = createAdminSupabaseClient();
          await admin.from('profiles').upsert(
            {
              id: data.user.id,
              email: data.user.email || '',
              plan: 'free',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } catch {
          // Ignore if already created
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch {
      // Fallback redirect
    }
  }

  // If code exchange failed or no code provided
  return NextResponse.redirect(`${origin}/login?confirmed=error`);
}
