import { getCurrentProfile } from '@/lib/supabase/server';
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
      return secureJsonResponse({ authenticated: false, user: null }, { status: 200 }, requestId);
    }

    return secureJsonResponse({
      authenticated: true,
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
