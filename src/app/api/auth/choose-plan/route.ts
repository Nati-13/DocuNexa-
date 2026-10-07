import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 16 * 1024,
    rateLimitAction: 'choose-plan',
    maxRequests: 20,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return secureJsonResponse({ error: 'Your session has expired. Please sign in again.' }, { status: 401 }, requestId);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: 'Malformed request payload.' }, { status: 400 }, requestId);
    }

    const { plan } = body;

    if (plan === 'free') {
      // FREE selection: do not create unnecessary DB mutations, preserve active session, redirect to Account
      return secureJsonResponse({
        success: true,
        plan: 'free',
        redirect: '/account',
      }, { status: 200 }, requestId);
    }

    if (plan === 'ad_free') {
      // AD-FREE selection: preserve session and route to checkout
      return secureJsonResponse({
        success: true,
        plan: profile.plan,
        redirect: '/account?checkout=ad_free',
      }, { status: 200 }, requestId);
    }

    return secureJsonResponse({ error: 'Invalid plan selection.' }, { status: 400 }, requestId);
  } catch (err: any) {
    return secureJsonResponse(
      { error: 'Something went wrong while confirming your plan. Please try again.' },
      { status: 500 },
      requestId
    );
  }
}
