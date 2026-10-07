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

    return secureJsonResponse(
      { success: true, message: result.message },
      { status: 200 },
      requestId
    );
  } catch {
    return secureJsonResponse(
      { success: true, message: "If an account exists for this email, we've sent a password reset code." },
      { status: 200 },
      requestId
    );
  }
}
