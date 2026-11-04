import { getCurrentProfile, hasUserAcceptedCurrentTerms } from '@/lib/supabase/server';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return secureJsonResponse({ authenticated: false, user: null, hasConsent: false }, { status: 200 }, requestId);
    }

    const hasConsent = await hasUserAcceptedCurrentTerms(profile.id);

    return secureJsonResponse({
      authenticated: true,
      hasConsent,
      user: {
        id: profile.id,
        email: profile.email,
        plan: profile.plan,
        created_at: profile.created_at,
      },
    }, { status: 200 }, requestId);
  } catch (err: any) {
    return secureJsonResponse(
      { authenticated: false, user: null, error: err.message },
      { status: 500 },
      requestId
    );
  }
}
