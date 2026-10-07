import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';
import { verifyRecoveryCode } from '@/lib/auth/passwordReset';

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 16 * 1024,
    rateLimitAction: 'pwd-reset-verify',
    maxRequests: 10,
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

    const { email, code } = body;
    if (!email || !code) {
      return secureJsonResponse({ error: 'Email and recovery code are required.' }, { status: 400 }, requestId);
    }

    const result = await verifyRecoveryCode(email, code);
    if (!result.success) {
      return secureJsonResponse({ error: result.error || 'Verification failed.' }, { status: 400 }, requestId);
    }

    return secureJsonResponse(
      { success: true, resetToken: result.resetToken },
      { status: 200 },
      requestId
    );
  } catch (err: any) {
    return secureJsonResponse(
      { error: err.message || 'Error verifying recovery code.' },
      { status: 500 },
      requestId
    );
  }
}
