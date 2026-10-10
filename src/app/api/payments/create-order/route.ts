import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminSupabaseClient } from '@/lib/supabase/server';
import { generateUniquePaymentAmount, getBybitConfig, normalizeAmount } from '@/lib/payments/bybit';
import { getAptosConfig, isValidAptosAddress } from '@/lib/payments/aptos';
import { validateCouponForUser, normalizeCouponCode } from '@/lib/coupons';
import { CouponDiscountType, PaymentNetwork } from '@/lib/supabase/types';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 16 * 1024,
    rateLimitAction: 'payment-create',
    maxRequests: 10,
    windowSeconds: 60,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return secureJsonResponse(
        { error: 'Please log in to upgrade to Ad-Free.' },
        { status: 401 },
        requestId
      );
    }

    if (profile.plan === 'ad_free') {
      return secureJsonResponse({
        success: true,
        alreadyPaid: true,
        message: 'Your account is already Ad-Free.',
        redirect: '/account',
      }, { status: 200 }, requestId);
    }

    const body = await req.json().catch(() => ({}));
    const rawCouponCode = body?.couponCode || body?.code;
    const requestedNetwork: PaymentNetwork = body?.network === 'Aptos' ? 'Aptos' : 'Polygon';

    let destinationAddress: string;
    if (requestedNetwork === 'Aptos') {
      const aptosConfig = getAptosConfig();
      if (!aptosConfig.receivingAddress || !isValidAptosAddress(aptosConfig.receivingAddress)) {
        return NextResponse.json(
          { error: 'Aptos payments are temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
      destinationAddress = aptosConfig.receivingAddress;
    } else {
      const { depositAddress } = getBybitConfig();
      if (!depositAddress) {
        return NextResponse.json(
          { error: 'Polygon payments are temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
      destinationAddress = depositAddress;
    }

    let couponId: string | null = null;
    let couponCode: string | null = null;
    let discountType: CouponDiscountType | null = null;
    let discountAmountUsdt = '0.000000';
    let originalAmountUsd = '2.000000';
    let finalAmountUsdt = '2.000000';
    let formattedDiscount: string | null = null;

    // Strict server-side revalidation of coupon code
    if (rawCouponCode && typeof rawCouponCode === 'string' && rawCouponCode.trim().length > 0) {
      const normalizedCode = normalizeCouponCode(rawCouponCode);
      const validation = await validateCouponForUser(normalizedCode, profile.id);

      if (!validation.valid || !validation.coupon || !validation.calculation) {
        return NextResponse.json(
          { error: validation.error || 'This coupon code is invalid or unavailable.' },
          { status: 400 }
        );
      }

      couponId = validation.coupon.id;
      couponCode = validation.coupon.code;
      discountType = validation.calculation.discountType;
      discountAmountUsdt = validation.calculation.discountAmountUsdt;
      originalAmountUsd = validation.calculation.originalAmountUsd;
      finalAmountUsdt = validation.calculation.finalAmountUsdt;
      formattedDiscount = validation.calculation.formattedDiscount;
    }

    const admin = createAdminSupabaseClient();
    const nowIso = new Date().toISOString();

    // Check if user already has an active, non-expired pending or detected order
    const { data: existingActive } = await admin
      .from('payment_orders')
      .select('*')
      .eq('user_id', profile.id)
      .in('status', ['pending', 'detected'])
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingActive && existingActive.length > 0) {
      const activeOrder = existingActive[0];
      const remainingSeconds = Math.max(
        0,
        Math.floor((new Date(activeOrder.expires_at).getTime() - Date.now()) / 1000)
      );

      // Check if requested coupon matches existing order coupon terms AND network matches
      const existingCoupon = activeOrder.coupon_code ? normalizeCouponCode(activeOrder.coupon_code) : null;
      const requestedCoupon = couponCode ? normalizeCouponCode(couponCode) : null;
      const activeNetwork = activeOrder.network || 'Polygon';

      if (existingCoupon === requestedCoupon && activeNetwork === requestedNetwork && remainingSeconds > 120) {
        return NextResponse.json({
          success: true,
          orderId: activeOrder.order_id,
          amount: activeOrder.payment_amount_usdt.toString(),
          basePriceUsd: activeOrder.original_amount_usd?.toString() || '2.00',
          originalPriceUsd: activeOrder.original_amount_usd?.toString() || '2.00',
          finalPriceUsdt: activeOrder.final_amount_usdt?.toString() || activeOrder.payment_amount_usdt.toString(),
          discountAmountUsdt: activeOrder.discount_amount_usdt?.toString() || '0.000000',
          couponCode: activeOrder.coupon_code || null,
          currency: 'USDT',
          network: activeNetwork,
          destinationAddress: activeOrder.destination_address,
          expiresAt: activeOrder.expires_at,
          expiresInSeconds: remainingSeconds,
        });
      } else {
        // User changed coupon terms or switched network: cancel older pending order
        if (activeOrder.status === 'pending') {
          await admin
            .from('payment_orders')
            .update({
              status: 'cancelled',
              failure_reason: activeNetwork !== requestedNetwork
                ? `Superseded by network switch to ${requestedNetwork}`
                : 'Superseded by updated coupon checkout',
            })
            .eq('id', activeOrder.id);
        }
      }
    }

    // Query all currently active amounts across all users to guarantee collision prevention
    const { data: activeOrders } = await admin
      .from('payment_orders')
      .select('payment_amount_usdt')
      .in('status', ['pending', 'detected'])
      .gt('expires_at', nowIso);

    const activeAmounts = new Set<string>();
    if (activeOrders) {
      for (const ord of activeOrders) {
        activeAmounts.add(normalizeAmount(ord.payment_amount_usdt));
      }
    }

    // Crucial requirement: generate unique amount based on final discounted payable price
    const uniqueAmount = generateUniquePaymentAmount(activeAmounts, finalAmountUsdt);
    const orderId = `DNX-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    const { error: insertError } = await admin.from('payment_orders').insert({
      user_id: profile.id,
      order_id: orderId,
      product: 'ad_free',
      base_amount_usd: 2.00,
      original_amount_usd: originalAmountUsd,
      discount_amount_usdt: discountAmountUsdt,
      final_amount_usdt: finalAmountUsdt,
      coupon_id: couponId,
      coupon_code: couponCode,
      discount_type: discountType,
      payment_amount_usdt: uniqueAmount,
      currency: 'USDT',
      network: requestedNetwork,
      destination_address: destinationAddress,
      status: 'pending',
      expires_at: expiresAt,
      created_at: nowIso,
      detected_at: null,
      confirmed_at: null,
      bybit_deposit_id: null,
      tx_id: null,
      block_hash: null,
      confirmations: null,
      received_amount: null,
      failure_reason: null,
      updated_at: nowIso,
    });

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create payment order. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      amount: uniqueAmount,
      basePriceUsd: originalAmountUsd,
      originalPriceUsd: originalAmountUsd,
      finalPriceUsdt: finalAmountUsdt,
      discountAmountUsdt: discountAmountUsdt,
      couponCode,
      formattedDiscount,
      currency: 'USDT',
      network: requestedNetwork,
      destinationAddress,
      expiresAt,
      expiresInSeconds: 1200,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error generating payment order' },
      { status: 500 }
    );
  }
}
