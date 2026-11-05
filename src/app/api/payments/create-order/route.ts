import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminSupabaseClient, hasUserAcceptedCurrentTerms } from '@/lib/supabase/server';
import { generateUniquePaymentAmount, getBybitConfig, normalizeAmount, formatPaymentAmount } from '@/lib/payments/bybit';
import { getAptosConfig, isValidAptosAddress } from '@/lib/payments/aptos';
import { getTronConfig, isValidTronAddress } from '@/lib/payments/tron';
import { getPolygonUsdcConfig, isValidEvmAddress } from '@/lib/payments/polygonUsdc';
import { validateCouponForUser, normalizeCouponCode } from '@/lib/coupons';
import { CouponDiscountType, PaymentNetwork, PaymentCurrency } from '@/lib/supabase/types';
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

    const hasConsent = await hasUserAcceptedCurrentTerms(profile.id);
    if (!hasConsent) {
      return secureJsonResponse(
        {
          error: 'Please review and accept the current Terms of Service and Privacy Policy to proceed with checkout.',
          code: 'CONSENT_REQUIRED',
          redirect: '/accept-terms',
        },
        { status: 403 },
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

    // Parse requested method, network, and currency
    const rawMethod = (body?.method || body?.paymentMethod || '').toString().toLowerCase().trim();
    const rawNetwork = (body?.network || '').toString().trim();
    const rawCurrency = (body?.currency || '').toString().toUpperCase().trim();

    let methodId: 'polygon_usdt' | 'aptos_usdt' | 'tron_usdt' | 'polygon_usdc';

    if (
      rawMethod === 'tron_usdt' ||
      rawMethod === 'tron' ||
      rawMethod === 'trc20' ||
      rawNetwork === 'TRON'
    ) {
      methodId = 'tron_usdt';
    } else if (
      rawMethod === 'polygon_usdc' ||
      rawMethod === 'usdc' ||
      rawMethod === 'usdc_polygon' ||
      rawNetwork === 'Polygon_USDC' ||
      (rawNetwork === 'Polygon' && rawCurrency === 'USDC')
    ) {
      methodId = 'polygon_usdc';
    } else if (
      rawMethod === 'aptos_usdt' ||
      rawMethod === 'aptos' ||
      rawNetwork === 'Aptos'
    ) {
      methodId = 'aptos_usdt';
    } else if (
      rawMethod === 'polygon_usdt' ||
      rawNetwork === 'Polygon' ||
      !rawMethod
    ) {
      methodId = 'polygon_usdt';
    } else {
      return NextResponse.json(
        {
          error: `Unsupported payment method "${rawMethod || rawNetwork}". Active methods are USDT (Polygon), USDT (Aptos), USDT (TRON), and USDC (Polygon).`,
          code: 'UNSUPPORTED_NETWORK',
        },
        { status: 400 }
      );
    }

    let requestedNetwork: PaymentNetwork;
    let requestedCurrency: PaymentCurrency;
    let destinationAddress: string;

    if (methodId === 'tron_usdt') {
      requestedNetwork = 'TRON';
      requestedCurrency = 'USDT';
      const tronConfig = getTronConfig();
      if (!tronConfig.isEnabled || !tronConfig.receivingAddress || !isValidTronAddress(tronConfig.receivingAddress)) {
        return NextResponse.json(
          {
            error: 'TRON TRC20 payments are temporarily unavailable. Missing configuration: USDT_TRC20_ADDRESS.',
            code: 'METHOD_UNAVAILABLE',
          },
          { status: 503 }
        );
      }
      destinationAddress = tronConfig.receivingAddress;
    } else if (methodId === 'polygon_usdc') {
      requestedNetwork = 'Polygon';
      requestedCurrency = 'USDC';
      const usdcConfig = getPolygonUsdcConfig();
      if (!usdcConfig.isEnabled || !usdcConfig.receivingAddress || !isValidEvmAddress(usdcConfig.receivingAddress)) {
        return NextResponse.json(
          {
            error: 'Polygon Native USDC payments are temporarily unavailable. Missing configuration: USDC_POLYGON_ADDRESS.',
            code: 'METHOD_UNAVAILABLE',
          },
          { status: 503 }
        );
      }
      destinationAddress = usdcConfig.receivingAddress;
    } else if (methodId === 'aptos_usdt') {
      requestedNetwork = 'Aptos';
      requestedCurrency = 'USDT';
      const aptosConfig = getAptosConfig();
      if (!aptosConfig.receivingAddress || !isValidAptosAddress(aptosConfig.receivingAddress)) {
        return NextResponse.json(
          {
            error: 'Aptos payments are temporarily unavailable. Missing configuration: APTOS_USDT_ADDRESS.',
            code: 'METHOD_UNAVAILABLE',
          },
          { status: 503 }
        );
      }
      destinationAddress = aptosConfig.receivingAddress;
    } else {
      requestedNetwork = 'Polygon';
      requestedCurrency = 'USDT';
      const { depositAddress } = getBybitConfig();
      if (!depositAddress || !isValidEvmAddress(depositAddress)) {
        return NextResponse.json(
          {
            error: 'Polygon USDT payments are temporarily unavailable. Missing Bybit configuration.',
            code: 'METHOD_UNAVAILABLE',
          },
          { status: 503 }
        );
      }
      destinationAddress = depositAddress;
    }

    let couponId: string | null = null;
    let couponCode: string | null = null;
    let discountType: CouponDiscountType | null = null;
    let discountAmountUsdt = '0.0000';
    let originalAmountUsd = '2.0000';
    let finalAmountUsdt = '2.0000';
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
      discountAmountUsdt = formatPaymentAmount(validation.calculation.discountAmountUsdt);
      originalAmountUsd = formatPaymentAmount(validation.calculation.originalAmountUsd);
      finalAmountUsdt = formatPaymentAmount(validation.calculation.finalAmountUsdt);
      formattedDiscount = validation.calculation.formattedDiscount;
    }

    const admin = createAdminSupabaseClient();
    const nowIso = new Date().toISOString();

    // -------------------------------------------------------------------------
    // Safe Complimentary Zero-Cost Order Flow (100% Discount)
    // -------------------------------------------------------------------------
    if (finalAmountUsdt === '0.0000' && couponCode && couponId) {
      if ((profile.plan as string) === 'ad_free') {
        return secureJsonResponse({
          success: true,
          alreadyPaid: true,
          message: 'Your account is already Ad-Free.',
          redirect: '/account',
        }, { status: 200 }, requestId);
      }

      const orderId = `DNX-FREE-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

      // 1. Try atomic PostgreSQL procedure (row-locked, ACID transaction)
      try {
        const { data: rpcRes, error: rpcErr } = await admin.rpc('redeem_zero_cost_coupon_atomic', {
          p_user_id: profile.id,
          p_coupon_id: couponId,
          p_order_id: orderId,
        });

        if (!rpcErr && rpcRes) {
          const rpcResult = rpcRes as any;
          if (rpcResult.already_paid) {
            return secureJsonResponse({
              success: true,
              alreadyPaid: true,
              message: 'Your account is already Ad-Free.',
              redirect: '/account',
            }, { status: 200 }, requestId);
          }

          if (rpcResult.success) {
            return NextResponse.json({
              success: true,
              zeroCost: true,
              activated: true,
              alreadyPaid: false,
              orderId,
              amount: '0.0000',
              originalPriceUsd: originalAmountUsd,
              discountAmountUsdt,
              couponCode,
              formattedDiscount: '100% off',
              message: '100% coupon applied! Ad-Free plan is now active.',
              redirect: '/account',
            });
          }

          if (rpcResult.error) {
            return NextResponse.json({ error: rpcResult.error }, { status: 400 });
          }
        }
      } catch {
        // Fall through to transactional rollback-safe application flow
      }

      // 2. Rollback-Safe Application Fallback Sequence
      // Step A: Insert confirmed zero-cost order
      const { data: newOrder, error: orderError } = await admin
        .from('payment_orders')
        .insert({
          user_id: profile.id,
          order_id: orderId,
          product: 'ad_free',
          base_amount_usd: 2.00,
          original_amount_usd: originalAmountUsd,
          discount_amount_usdt: discountAmountUsdt,
          final_amount_usdt: '0.0000',
          payment_amount_usdt: '0.0000',
          coupon_id: couponId,
          coupon_code: couponCode,
          discount_type: discountType,
          currency: 'USDT',
          network: requestedNetwork,
          destination_address: 'COMPLIMENTARY_ACTIVATION',
          status: 'confirmed',
          expires_at: nowIso,
          created_at: nowIso,
          detected_at: null,
          confirmed_at: nowIso,
          bybit_deposit_id: null,
          tx_id: null,
          block_hash: null,
          confirmations: null,
          received_amount: '0.0000',
          failure_reason: null,
          updated_at: nowIso,
        })
        .select('*')
        .single();

      if (orderError || !newOrder) {
        return NextResponse.json(
          { error: 'Failed to process complimentary activation. Please try again.' },
          { status: 500 }
        );
      }

      // Step B: Record coupon redemption
      const { data: redemptionData, error: redemptionError } = await admin
        .from('coupon_redemptions')
        .insert({
          coupon_id: couponId,
          user_id: profile.id,
          payment_order_id: newOrder.id,
          discount_amount_usdt: discountAmountUsdt,
          redeemed_at: nowIso,
        })
        .select('id')
        .single();

      if (redemptionError || !redemptionData) {
        // ROLLBACK Step A: Remove the payment order
        await admin.from('payment_orders').delete().eq('id', newOrder.id);
        return NextResponse.json(
          { error: 'Could not record coupon redemption. No order was charged.' },
          { status: 500 }
        );
      }

      // Step C: Increment coupon redemption count
      const { data: couponData } = await admin
        .from('coupons')
        .select('redemption_count')
        .eq('id', couponId)
        .single();

      const { error: couponCountError } = await admin
        .from('coupons')
        .update({
          redemption_count: ((couponData?.redemption_count as number) || 0) + 1,
          updated_at: nowIso,
        })
        .eq('id', couponId);

      if (couponCountError) {
        // ROLLBACK Steps A & B
        await admin.from('coupon_redemptions').delete().eq('id', redemptionData.id);
        await admin.from('payment_orders').delete().eq('id', newOrder.id);
        return NextResponse.json(
          { error: 'Could not update coupon counter. Activation rolled back safely.' },
          { status: 500 }
        );
      }

      // Step D: Activate user entitlement in profile
      const { error: profileError } = await admin
        .from('profiles')
        .update({
          plan: 'ad_free',
          updated_at: nowIso,
        })
        .eq('id', profile.id);

      if (profileError) {
        // ROLLBACK Steps A, B & C
        await admin
          .from('coupons')
          .update({
            redemption_count: (couponData?.redemption_count as number) || 0,
            updated_at: nowIso,
          })
          .eq('id', couponId);
        await admin.from('coupon_redemptions').delete().eq('id', redemptionData.id);
        await admin.from('payment_orders').delete().eq('id', newOrder.id);

        return NextResponse.json(
          { error: 'Failed to activate Ad-Free plan. Transaction rolled back safely.' },
          { status: 500 }
        );
      }

      // Step E: Cancel prior pending payment orders
      await admin
        .from('payment_orders')
        .update({
          status: 'cancelled',
          failure_reason: 'Superseded by complimentary 100% coupon activation',
          updated_at: nowIso,
        })
        .eq('user_id', profile.id)
        .eq('status', 'pending');

      return NextResponse.json({
        success: true,
        zeroCost: true,
        activated: true,
        alreadyPaid: false,
        orderId,
        amount: '0.0000',
        originalPriceUsd: originalAmountUsd,
        discountAmountUsdt,
        couponCode,
        formattedDiscount: '100% off',
        message: '100% coupon applied! Ad-Free plan is now active.',
        redirect: '/account',
      });
    }

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

      // Check if requested coupon matches existing order coupon terms AND network/currency matches
      const existingCoupon = activeOrder.coupon_code ? normalizeCouponCode(activeOrder.coupon_code) : null;
      const requestedCoupon = couponCode ? normalizeCouponCode(couponCode) : null;
      const activeNetwork = activeOrder.network || 'Polygon';
      const activeCurrency = activeOrder.currency || 'USDT';

      if (
        existingCoupon === requestedCoupon &&
        activeNetwork === requestedNetwork &&
        activeCurrency === requestedCurrency &&
        remainingSeconds > 120
      ) {
        return NextResponse.json({
          success: true,
          orderId: activeOrder.order_id,
          amount: formatPaymentAmount(activeOrder.payment_amount_usdt),
          basePriceUsd: formatPaymentAmount(activeOrder.original_amount_usd || '2.00'),
          originalPriceUsd: formatPaymentAmount(activeOrder.original_amount_usd || '2.00'),
          finalPriceUsdt: formatPaymentAmount(activeOrder.final_amount_usdt || activeOrder.payment_amount_usdt),
          discountAmountUsdt: formatPaymentAmount(activeOrder.discount_amount_usdt || '0.0000'),
          couponCode: activeOrder.coupon_code || null,
          currency: activeCurrency,
          network: activeNetwork,
          destinationAddress: activeOrder.destination_address,
          expiresAt: activeOrder.expires_at,
          expiresInSeconds: remainingSeconds,
        });
      } else {
        // User changed coupon terms or switched network/token: cancel older pending order
        if (activeOrder.status === 'pending') {
          await admin
            .from('payment_orders')
            .update({
              status: 'cancelled',
              failure_reason: activeNetwork !== requestedNetwork || activeCurrency !== requestedCurrency
                ? `Superseded by switch to ${requestedCurrency} on ${requestedNetwork}`
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
        if (ord.payment_amount_usdt !== null && ord.payment_amount_usdt !== undefined) {
          activeAmounts.add(ord.payment_amount_usdt.toString());
        }
      }
    }

    // Crucial requirement: generate unique amount based on final discounted payable price with exact 4 decimals
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
      currency: requestedCurrency,
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
      currency: requestedCurrency,
      network: requestedNetwork,
      destinationAddress,
      expiresAt,
      expiresInSeconds: 1200,
    });
  } catch (err: any) {
    const isExhausted = err?.message?.includes('All unique payment amounts');
    return NextResponse.json(
      { error: err.message || 'Error generating payment order' },
      { status: isExhausted ? 409 : 500 }
    );
  }
}
