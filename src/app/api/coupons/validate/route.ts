import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { validateCouponForUser, normalizeCouponCode } from '@/lib/coupons';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 16 * 1024,
    rateLimitAction: 'coupon-validate',
    maxRequests: 15,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return secureJsonResponse(
        { error: 'Please log in to apply a coupon.' },
        { status: 401 },
        requestId
      );
    }

    if (profile.plan === 'ad_free') {
      return secureJsonResponse(
        { error: 'Your account is already Ad-Free. No upgrade needed.' },
        { status: 400 },
        requestId
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: 'Malformed request JSON.' }, { status: 400 }, requestId);
    }

    const rawCode = body?.code;

    if (!rawCode || typeof rawCode !== 'string') {
      return secureJsonResponse(
        { error: 'Please enter a valid coupon code.' },
        { status: 400 },
        requestId
      );
    }

    const code = normalizeCouponCode(rawCode);
    const result = await validateCouponForUser(code, profile.id);

    if (!result.valid || !result.calculation) {
      return secureJsonResponse(
        { error: result.error || 'This coupon code is invalid or unavailable.' },
        { status: 400 },
        requestId
      );
    }

    return secureJsonResponse({
      success: true,
      code,
      discountType: result.calculation.discountType,
      formattedDiscount: result.calculation.formattedDiscount,
      originalAmountUsd: result.calculation.originalAmountUsd,
      discountAmountUsdt: result.calculation.discountAmountUsdt,
      finalAmountUsdt: result.calculation.finalAmountUsdt,
    }, { status: 200 }, requestId);
  } catch (err: any) {
    return secureJsonResponse(
      { error: err.message || 'Error validating coupon code.' },
      { status: 500 },
      requestId
    );
  }
}
