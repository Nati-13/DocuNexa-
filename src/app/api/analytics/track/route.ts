import { NextRequest, NextResponse } from 'next/server';
import { recordAnalyticsEvent } from '@/lib/analytics/tracker';
import { getClientIp } from '@/lib/security/rateLimit';
import { getCurrentProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPath = typeof body?.path === 'string' ? body.path : '/';

    // Disallow tracking internal admin paths to keep public metrics pure
    if (rawPath.startsWith('/admin') || rawPath.startsWith('/api')) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const countryCode =
      req.headers.get('x-vercel-ip-country') ||
      req.headers.get('cf-ipcountry') ||
      req.headers.get('x-country') ||
      null;

    const ip = getClientIp(req);
    const profile = await getCurrentProfile().catch(() => null);

    await recordAnalyticsEvent({
      eventType: 'pageview',
      path: rawPath,
      countryCode,
      ip,
      userId: profile?.id || null,
    });

    return NextResponse.json({ success: true });
  } catch {
    // Analytics tracking must fail silently and never disrupt client experience
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
