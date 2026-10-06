import { DbCoupon, CouponDiscountType } from '@/lib/supabase/types';
import { parseExactUsdt } from '@/lib/payments/bybit';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export const AD_FREE_BASE_PRICE_USD = '2.000000';
export const AD_FREE_BASE_MICRO = 2000000n; // 2.00 USDT in micro-units

export interface CouponDiscountCalculation {
  valid: boolean;
  error?: string;
  originalAmountUsd: string;
  discountAmountUsdt: string;
  finalAmountUsdt: string;
  discountType: CouponDiscountType;
  discountValue: string;
  formattedDiscount: string;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: DbCoupon;
  calculation?: CouponDiscountCalculation;
}

/**
 * Normalizes a coupon code: trims whitespace and converts to uppercase.
 */
export function normalizeCouponCode(code: string): string {
  if (!code || typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

/**
 * Validates whether a coupon code matches the allowed character set:
 * A-Z, 0-9, dash (-), underscore (_), length between 2 and 30.
 * Spaces are disallowed.
 */
export function isValidCouponCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const normalized = normalizeCouponCode(code);
  return /^[A-Z0-9_-]{2,30}$/.test(normalized);
}

/**
 * Formats a micro-unit integer to a standard 6-decimal string.
 */
export function formatMicroUnits(micro: bigint): string {
  const isNegative = micro < 0n;
  const absMicro = isNegative ? -micro : micro;
  const intPart = absMicro / 1000000n;
  const fracPart = (absMicro % 1000000n).toString().padStart(6, '0');
  return `${isNegative ? '-' : ''}${intPart}.${fracPart}`;
}

/**
 * Calculates discount and final payable amount using exact integer micro-units.
 * Strictly avoids IEEE-754 floating point arithmetic.
 *
 * Rules:
 * - Base price is 2.000000 USD (Ad-Free).
 * - Percentage discount: Allowed 0% - 99%. Final amount must remain > 0.
 * - Fixed USDT discount: Must be > 0 and < 2.00 USDT. Final amount must remain > 0.
 */
export function calculateCouponDiscount(
  discountType: CouponDiscountType,
  discountValue: string | number,
  baseAmountUsd: string | number = AD_FREE_BASE_PRICE_USD
): CouponDiscountCalculation {
  const baseParsed = parseExactUsdt(baseAmountUsd);
  if (!baseParsed.valid || baseParsed.microUnits <= 0n) {
    return {
      valid: false,
      error: 'Invalid base price for discount calculation.',
      originalAmountUsd: '2.000000',
      discountAmountUsdt: '0.000000',
      finalAmountUsdt: '2.000000',
      discountType,
      discountValue: String(discountValue),
      formattedDiscount: '0',
    };
  }

  const baseMicro = baseParsed.microUnits;
  let discountMicro = 0n;
  let formattedDiscount = '';

  if (discountType === 'percent') {
    const parsedPercent = parseExactUsdt(discountValue);
    if (!parsedPercent.valid) {
      return {
        valid: false,
        error: 'Invalid percentage discount value.',
        originalAmountUsd: formatMicroUnits(baseMicro),
        discountAmountUsdt: '0.000000',
        finalAmountUsdt: formatMicroUnits(baseMicro),
        discountType,
        discountValue: String(discountValue),
        formattedDiscount: '0%',
      };
    }

    // Percent bounds check: must be > 0 and <= 99%
    // In micro-units: 1% = 1_000_000n, 99% = 99_000_000n, 100% = 100_000_000n
    if (parsedPercent.microUnits <= 0n || parsedPercent.microUnits > 99000000n) {
      return {
        valid: false,
        error: 'Percentage discount must be between 1% and 99%.',
        originalAmountUsd: formatMicroUnits(baseMicro),
        discountAmountUsdt: '0.000000',
        finalAmountUsdt: formatMicroUnits(baseMicro),
        discountType,
        discountValue: String(discountValue),
        formattedDiscount: '0%',
      };
    }

    // Exact arithmetic: discountMicro = (baseMicro * percentMicro) / 100_000_000n
    discountMicro = (baseMicro * parsedPercent.microUnits) / 100000000n;
    formattedDiscount = `${(Number(parsedPercent.microUnits) / 1000000).toFixed(0)}% off`;
  } else if (discountType === 'fixed_usdt') {
    const parsedFixed = parseExactUsdt(discountValue);
    if (!parsedFixed.valid) {
      return {
        valid: false,
        error: 'Invalid fixed USDT discount value.',
        originalAmountUsd: formatMicroUnits(baseMicro),
        discountAmountUsdt: '0.000000',
        finalAmountUsdt: formatMicroUnits(baseMicro),
        discountType,
        discountValue: String(discountValue),
        formattedDiscount: '0 USDT',
      };
    }

    // Fixed bounds check: must be > 0 and < baseMicro ($2.00)
    if (parsedFixed.microUnits <= 0n || parsedFixed.microUnits >= baseMicro) {
      return {
        valid: false,
        error: 'Fixed discount must be greater than 0 and less than $2.00 USD.',
        originalAmountUsd: formatMicroUnits(baseMicro),
        discountAmountUsdt: '0.000000',
        finalAmountUsdt: formatMicroUnits(baseMicro),
        discountType,
        discountValue: String(discountValue),
        formattedDiscount: '0 USDT',
      };
    }

    discountMicro = parsedFixed.microUnits;
    formattedDiscount = `${formatMicroUnits(discountMicro)} USDT off`;
  } else {
    return {
      valid: false,
      error: 'Unsupported coupon discount type.',
      originalAmountUsd: formatMicroUnits(baseMicro),
      discountAmountUsdt: '0.000000',
      finalAmountUsdt: formatMicroUnits(baseMicro),
      discountType,
      discountValue: String(discountValue),
      formattedDiscount: '0',
    };
  }

  const finalMicro = baseMicro - discountMicro;

  // Crucial requirement: final amount must ALWAYS remain greater than 0
  if (finalMicro <= 0n) {
    return {
      valid: false,
      error: 'The final payable amount must remain greater than zero.',
      originalAmountUsd: formatMicroUnits(baseMicro),
      discountAmountUsdt: '0.000000',
      finalAmountUsdt: formatMicroUnits(baseMicro),
      discountType,
      discountValue: String(discountValue),
      formattedDiscount,
    };
  }

  return {
    valid: true,
    originalAmountUsd: formatMicroUnits(baseMicro),
    discountAmountUsdt: formatMicroUnits(discountMicro),
    finalAmountUsdt: formatMicroUnits(finalMicro),
    discountType,
    discountValue: String(discountValue),
    formattedDiscount,
  };
}

/**
 * Server-side evaluation of coupon validity against business rules, dates, and redemption limits.
 */
export async function validateCouponForUser(
  rawCode: string,
  userId: string
): Promise<CouponValidationResult> {
  const code = normalizeCouponCode(rawCode);
  if (!code || !isValidCouponCodeFormat(code)) {
    return {
      valid: false,
      error: 'This coupon code is invalid or unavailable.',
    };
  }

  const admin = createAdminSupabaseClient();

  // Query coupon record
  const { data: coupon, error: couponError } = await admin
    .from('coupons')
    .select('*')
    .eq('code', code)
    .single();

  if (couponError || !coupon) {
    return {
      valid: false,
      error: 'This coupon code is invalid or unavailable.',
    };
  }

  // 1. Verify Active Status
  if (!coupon.active) {
    return {
      valid: false,
      error: 'This coupon code is invalid or unavailable.',
    };
  }

  const nowMs = Date.now();

  // 2. Verify Start Date
  if (coupon.starts_at) {
    const startsAtMs = new Date(coupon.starts_at).getTime();
    if (nowMs < startsAtMs) {
      return {
        valid: false,
        error: 'This coupon code is not yet active.',
      };
    }
  }

  // 3. Verify Expiration Date
  if (coupon.expires_at) {
    const expiresAtMs = new Date(coupon.expires_at).getTime();
    if (nowMs >= expiresAtMs) {
      return {
        valid: false,
        error: 'This coupon has expired.',
      };
    }
  }

  // 4. Verify Global Redemption Limit
  if (coupon.max_redemptions !== null && coupon.max_redemptions !== undefined) {
    if (coupon.redemption_count >= coupon.max_redemptions) {
      return {
        valid: false,
        error: 'This coupon code has reached its maximum redemptions limit.',
      };
    }
  }

  // 5. Verify Per-User Redemption Limit
  const { count: userRedemptionsCount, error: countError } = await admin
    .from('coupon_redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('coupon_id', coupon.id)
    .eq('user_id', userId);

  if (countError) {
    return {
      valid: false,
      error: 'Failed to verify coupon eligibility. Please try again.',
    };
  }

  const perUserLimit = coupon.max_redemptions_per_user || 1;
  if ((userRedemptionsCount || 0) >= perUserLimit) {
    return {
      valid: false,
      error: 'This coupon has already been used on your account.',
    };
  }

  // 6. Calculate Discount and Final Price
  const calculation = calculateCouponDiscount(
    coupon.discount_type,
    coupon.discount_value,
    AD_FREE_BASE_PRICE_USD
  );

  if (!calculation.valid) {
    return {
      valid: false,
      error: calculation.error || 'Failed to calculate coupon discount.',
    };
  }

  return {
    valid: true,
    coupon,
    calculation,
  };
}
