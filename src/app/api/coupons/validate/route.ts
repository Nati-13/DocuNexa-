import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { validateCouponForUser, normalizeCouponCode } from '@/lib/coupons';

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json(
        { error: 'Please log in to apply a coupon.' },
        { status: 401 }
      );
    }

    if (profile.plan === 'ad_free') {
      return NextResponse.json(
        { error: 'Your account is already Ad-Free. No upgrade needed.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawCode = body?.code;

    if (!rawCode || typeof rawCode !== 'string') {
      return NextResponse.json(
        { error: 'Please enter a valid coupon code.' },
        { status: 400 }
      );
    }

    const code = normalizeCouponCode(rawCode);
    const result = await validateCouponForUser(code, profile.id);

    if (!result.valid || !result.calculation) {
      return NextResponse.json(
        { error: result.error || 'This coupon code is invalid or unavailable.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      code,
      discountType: result.calculation.discountType,
      formattedDiscount: result.calculation.formattedDiscount,
      originalAmountUsd: result.calculation.originalAmountUsd,
      discountAmountUsdt: result.calculation.discountAmountUsdt,
      finalAmountUsdt: result.calculation.finalAmountUsdt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error validating coupon code.' },
      { status: 500 }
    );
  }
}
