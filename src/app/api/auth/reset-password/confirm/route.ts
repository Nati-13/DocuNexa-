import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';
import { completePasswordReset } from '@/lib/auth/passwordReset';

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 16 * 1024,
    rateLimitAction: 'pwd-reset-confirm',
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

    const { email, resetToken, newPassword, confirmPassword } = body;

    if (!email || !resetToken || !newPassword) {
      return secureJsonResponse({ error: 'Missing required reset parameters.' }, { status: 400 }, requestId);
    }

    if (newPassword !== confirmPassword) {
      return secureJsonResponse({ error: 'Passwords do not match.' }, { status: 400 }, requestId);
    }

    const result = await completePasswordReset(email, resetToken, newPassword);
    if (!result.success) {
      return secureJsonResponse({ error: result.error || 'Password reset failed.' }, { status: 400 }, requestId);
    }

    return secureJsonResponse(
      { success: true, message: 'Your password has been reset successfully. You can now sign in.' },
      { status: 200 },
      requestId
    );
  } catch (err: any) {
    return secureJsonResponse(
      { error: err.message || 'Error completing password reset.' },
      { status: 500 },
      requestId
    );
  }
}
