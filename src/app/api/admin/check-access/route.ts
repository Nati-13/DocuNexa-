import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/admin/auth';

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ isAdmin: false, authenticated: false });
    }

    const isAdmin = await isUserAdmin(profile.id);
    return NextResponse.json({ isAdmin, authenticated: true });
  } catch {
    return NextResponse.json({ isAdmin: false, authenticated: false });
  }
}
