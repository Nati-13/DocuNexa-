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

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    console.error(
      `[Admin Bootstrap Status Config Error] [Request ID: ${requestId}]: Server-side Supabase configuration missing.`
    );
    return secureJsonResponse(
      {
        error:
          'Server authentication configuration is incomplete. The server-side Supabase secret key (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY) is not configured in the environment. Please contact support.',
        code: 'CONFIG_MISSING',
        requestId,
      },
      { status: 503 },
      requestId
    );
  }

  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SETUP_KEY) {
    return secureJsonResponse(
      {
        error:
          'Administrator bootstrap is disabled in production until ADMIN_SETUP_KEY is configured in server environment variables.',
        code: 'ADMIN_SETUP_KEY_REQUIRED',
        isSetup: false,
        canBootstrap: false,
        requiresSetupKey: true,
        requestId,
      },
      { status: 503 },
      requestId
    );
  }

  try {
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
  } catch (err: any) {
    console.error(
      `[Admin Bootstrap Status Error] [Request ID: ${requestId}]: Database access failure:`,
      err?.message || err
    );
    return secureJsonResponse(
      {
        error:
          'Unable to verify administrator setup status due to a database service error. Please try again later.',
        code: 'DATABASE_UNAVAILABLE',
        requestId,
      },
      { status: 503 },
      requestId
    );
  }
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

  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SETUP_KEY) {
    return secureJsonResponse(
      {
        error:
          'Administrator bootstrap is disabled in production until ADMIN_SETUP_KEY is configured in server environment variables.',
        code: 'ADMIN_SETUP_KEY_REQUIRED',
        requestId,
      },
      { status: 503 },
      requestId
    );
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
