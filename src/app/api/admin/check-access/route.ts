import { getCurrentProfile } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/admin/auth';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
    rateLimitAction: 'admin-check-access',
    maxRequests: 60,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return secureJsonResponse({ isAdmin: false, authenticated: false }, { status: 200 }, requestId);
    }

    const isAdmin = await isUserAdmin(profile.id);
    return secureJsonResponse({ isAdmin, authenticated: true }, { status: 200 }, requestId);
  } catch {
    return secureJsonResponse({ isAdmin: false, authenticated: false }, { status: 200 }, requestId);
  }
}
