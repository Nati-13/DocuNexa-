import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';
import { isBootstrapAvailable, bootstrapFirstAdmin } from '@/lib/admin/bootstrap';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
    rateLimitAction: 'admin-bootstrap-status',
    maxRequests: 30,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  const available = await isBootstrapAvailable();
  return secureJsonResponse(
    {
      isSetup: !available,
      canBootstrap: available,
      requiresSetupKey: !!process.env.ADMIN_SETUP_KEY,
    },
    { status: 200 },
    requestId
  );
}

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 16 * 1024,
    rateLimitAction: 'admin-bootstrap-execute',
    maxRequests: 5,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: 'Malformed request JSON.' }, { status: 400 }, requestId);
    }

    const { email, password, setupKey } = body || {};

    if (!email || !password) {
      return secureJsonResponse({ error: 'Email and password are required.' }, { status: 400 }, requestId);
    }

    const result = await bootstrapFirstAdmin({ email, password, setupKey });

    if (!result.success) {
      const status = result.error?.includes('locked') ? 403 : 400;
      return secureJsonResponse({ error: result.error }, { status }, requestId);
    }

    return secureJsonResponse(
      { success: true, message: result.message },
      { status: 200 },
      requestId
    );
  } catch (err: any) {
    return secureJsonResponse(
      { error: err.message || 'Internal error during administrator setup.' },
      { status: 500 },
      requestId
    );
  }
}
