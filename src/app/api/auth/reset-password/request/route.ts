import { getClientIp } from '@/lib/security/rateLimit';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';
import { requestPasswordReset } from '@/lib/auth/passwordReset';

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 16 * 1024,
    rateLimitAction: 'pwd-reset-request',
    maxRequests: 3,
    windowSeconds: 900, // 3 requests per 15 minutes
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

    const { email } = body;
    if (!email || typeof email !== 'string') {
      return secureJsonResponse({ error: 'A valid email address is required.' }, { status: 400 }, requestId);
    }

    const ip = getClientIp(req);
    const result = await requestPasswordReset(email, ip);

    if (!result.success) {
      console.error(
        `[Password Reset Request Error] [Request ID: ${requestId}]: ${result.error || 'Email service unavailable.'}`
      );
      return secureJsonResponse(
        {
          error: result.error || 'Password reset email service is currently not configured or unavailable.',
          code: 'EMAIL_SERVICE_UNAVAILABLE',
          requestId,
        },
        { status: 503 },
        requestId
      );
    }

    return secureJsonResponse(
      { success: true, message: result.message },
      { status: 200 },
      requestId
    );
  } catch (err: any) {
    const isConfigError =
      err?.message?.includes('secret key') ||
      err?.message?.includes('configuration');

    if (isConfigError) {
      console.error(
        `[Password Reset Request Config Error] [Request ID: ${requestId}]: Server configuration missing: ${err.message}`
      );
      return secureJsonResponse(
        {
          error: 'Password reset service configuration error. Please contact the administrator.',
          code: 'CONFIG_MISSING',
          requestId,
        },
        { status: 503 },
        requestId
      );
    }

    console.error(`[Password Reset Request Error] [Request ID: ${requestId}]:`, err?.message || err);
    return secureJsonResponse(
      { error: 'An unexpected error occurred while requesting password reset. Please try again.', requestId },
      { status: 500 },
      requestId
    );
  }
}
