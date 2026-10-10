import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminSupabaseClient } from '@/lib/supabase/server';
import { fetchBybitDeposits, matchDepositToOrder } from '@/lib/payments/bybit';
import { fetchAptosUsdtDeposits, matchAptosDepositToOrder } from '@/lib/payments/aptos';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['GET'],
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return secureJsonResponse({ error: 'Unauthorized' }, { status: 401 }, requestId);
    }

    const searchParams = req.nextUrl.searchParams;
    const orderId = searchParams.get('orderId') || searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId parameter' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: order, error } = await admin
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Payment order not found' }, { status: 404 });
    }

    // Security: Enforce strict ownership check
    if (order.user_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Idempotency: If already confirmed, return status immediately
    if (order.status === 'confirmed') {
      return NextResponse.json({
        status: 'confirmed',
        isAdFree: true,
        orderId: order.order_id,
        txId: order.tx_id,
        confirmedAt: order.confirmed_at,
        amount: order.payment_amount_usdt,
        currency: order.currency,
        network: order.network,
      });
    }

    // If order was cancelled
    if (order.status === 'cancelled') {
      return NextResponse.json({
        status: 'cancelled',
        message: 'Order was cancelled.',
      });
    }

    const nowMs = Date.now();
    const orderCreatedMs = new Date(order.created_at).getTime();
    const orderExpiresMs = new Date(order.expires_at).getTime();
    const isPastExpiration = nowMs > orderExpiresMs;

    // Fetch consumed deposit IDs from other orders to prevent double-spending / replay
    const { data: consumedRows } = await admin
      .from('payment_orders')
      .select('bybit_deposit_id, tx_id')
      .neq('order_id', order.order_id)
      .not('bybit_deposit_id', 'is', null);

    const consumedSet = new Set<string>();
    if (consumedRows) {
      for (const row of consumedRows) {
        if (row.bybit_deposit_id) consumedSet.add(row.bybit_deposit_id);
        if (row.tx_id) consumedSet.add(row.tx_id);
      }
    }

    const nowIso = new Date().toISOString();

    // =========================================================================
    // APTOS VERIFICATION PATH
    // =========================================================================
    if (order.network === 'Aptos') {
      const depositsResult = await fetchAptosUsdtDeposits({
        receivingAddress: order.destination_address,
        limit: 50,
      });

      if (!depositsResult.success) {
        return NextResponse.json({
          status: order.status,
          isAdFree: false,
          orderId: order.order_id,
          message: 'We are temporarily unable to verify Aptos payments. Please wait and try again.',
          retryable: true,
        });
      }

      const match = await matchAptosDepositToOrder(order, depositsResult.activities, consumedSet);

      // 1. Confirmed Aptos Payment Match
      if (match.matched && match.status === 'confirmed' && match.activity) {
        const act = match.activity;
        const depId = match.depositId || `aptos:${act.transaction_version}`;
        const txHash = match.txHash || depId;
        const receivedAmount = (Number(act.amount) / 1000000).toFixed(6);

        // Try atomic confirmation RPC first
        const { error: rpcErr } = await admin.rpc('confirm_payment_order', {
          p_order_id: order.order_id,
          p_bybit_deposit_id: depId,
          p_tx_id: txHash,
          p_block_hash: null,
          p_confirmations: 1,
          p_received_amount: receivedAmount,
        });

        if (rpcErr) {
          // Fallback transactional flow
          if (order.coupon_id) {
            const { data: couponRow } = await admin
              .from('coupons')
              .select('*')
              .eq('id', order.coupon_id)
              .single();

            if (couponRow) {
              await admin.from('coupon_redemptions').insert({
                coupon_id: order.coupon_id,
                user_id: profile.id,
                payment_order_id: order.id,
                discount_amount_usdt: order.discount_amount_usdt || '0.000000',
                redeemed_at: nowIso,
              });

              await admin
                .from('coupons')
                .update({
                  redemption_count: (couponRow.redemption_count || 0) + 1,
                  updated_at: nowIso,
                })
                .eq('id', order.coupon_id);
            }
          }

          // Update payment order to confirmed
          await admin
            .from('payment_orders')
            .update({
              status: 'confirmed',
              confirmed_at: nowIso,
              bybit_deposit_id: depId,
              tx_id: txHash,
              confirmations: 1,
              received_amount: receivedAmount,
              failure_reason: null,
              updated_at: nowIso,
            })
            .eq('order_id', order.order_id);

          // Elevate user profile to ad_free
          await admin
            .from('profiles')
            .update({
              plan: 'ad_free',
              updated_at: nowIso,
            })
            .eq('id', profile.id);
        }

        return NextResponse.json({
          status: 'confirmed',
          isAdFree: true,
          orderId: order.order_id,
          txId: txHash,
          confirmedAt: nowIso,
          amount: order.payment_amount_usdt,
          originalPriceUsd: order.original_amount_usd || '2.00',
          finalPriceUsdt: order.final_amount_usdt || order.payment_amount_usdt,
          discountAmountUsdt: order.discount_amount_usdt || '0.000000',
          couponCode: order.coupon_code || null,
          currency: 'USDT',
          network: 'Aptos',
          message: 'Payment confirmed on Aptos mainnet! Ad-Free status activated.',
        });
      }

      // 2. Late Payment on Aptos
      if (match.matched && match.status === 'late_payment' && match.activity) {
        const act = match.activity;
        const txHash = match.txHash || `aptos:${act.transaction_version}`;
        const receivedAmount = (Number(act.amount) / 1000000).toFixed(6);

        await admin
          .from('payment_orders')
          .update({
            status: 'late_payment',
            tx_id: txHash,
            received_amount: receivedAmount,
            failure_reason: 'Deposit arrived after 20-minute window expired on Aptos',
            updated_at: nowIso,
          })
          .eq('order_id', order.order_id);

        return NextResponse.json({
          status: 'late_payment',
          isAdFree: false,
          orderId: order.order_id,
          txId: txHash,
          network: 'Aptos',
          message: 'Payment was received on Aptos after the 20-minute order window expired. Please contact support.',
        });
      }

      // 3. Amount Mismatch on Aptos
      if (match.status === 'amount_mismatch' && match.activity) {
        const act = match.activity;
        const txHash = match.txHash || `aptos:${act.transaction_version}`;
        const receivedAmount = (Number(act.amount) / 1000000).toFixed(6);

        await admin
          .from('payment_orders')
          .update({
            status: 'amount_mismatch',
            tx_id: txHash,
            received_amount: receivedAmount,
            failure_reason: match.reason || 'Amount mismatch on Aptos',
            updated_at: nowIso,
          })
          .eq('order_id', order.order_id);

        return NextResponse.json({
          status: 'amount_mismatch',
          isAdFree: false,
          orderId: order.order_id,
          network: 'Aptos',
          message: match.reason || 'An Aptos transfer with an incorrect amount was detected.',
        });
      }

      // 4. Expired Order (time elapsed without valid deposit)
      if (isPastExpiration) {
        if (order.status === 'pending') {
          await admin
            .from('payment_orders')
            .update({
              status: 'expired',
              failure_reason: '20-minute validity period expired without Aptos payment',
              updated_at: nowIso,
            })
            .eq('order_id', order.order_id);
        }

        return NextResponse.json({
          status: 'expired',
          isAdFree: false,
          orderId: order.order_id,
          network: 'Aptos',
          message: 'Payment window expired. Please generate a new payment order.',
        });
      }

      // 5. Still Pending on Aptos
      const remainingSeconds = Math.max(0, Math.floor((orderExpiresMs - nowMs) / 1000));
      return NextResponse.json({
        status: order.status,
        isAdFree: false,
        orderId: order.order_id,
        amount: order.payment_amount_usdt,
        currency: order.currency,
        network: 'Aptos',
        destinationAddress: order.destination_address,
        expiresInSeconds: remainingSeconds,
        message: 'Waiting for transfer on Aptos mainnet...',
      });
    }

    // =========================================================================
    // POLYGON (BYBIT) VERIFICATION PATH
    // =========================================================================
    const depositsResult = await fetchBybitDeposits({
      coin: 'USDT',
      startTime: Math.max(0, orderCreatedMs - 60000), // Allow 60s clock skew
    });

    if (!depositsResult.success) {
      return NextResponse.json({
        status: order.status,
        isAdFree: false,
        orderId: order.order_id,
        message: 'We are temporarily unable to verify the payment. Please wait and try again.',
        retryable: true,
      });
    }

    const deposits = depositsResult.rows || [];
    const match = matchDepositToOrder(order, deposits, consumedSet);

    // 1. Confirmed Payment Match
    if (match.matched && match.status === 'confirmed' && match.deposit) {
      const dep = match.deposit;
      const depId = dep.id || dep.depositId || dep.txID;

      // Try atomic confirmation RPC first
      const { error: rpcErr } = await admin.rpc('confirm_payment_order', {
        p_order_id: order.order_id,
        p_bybit_deposit_id: depId,
        p_tx_id: dep.txID,
        p_block_hash: dep.blockHash || null,
        p_confirmations: dep.confirmations ? parseInt(dep.confirmations, 10) : null,
        p_received_amount: dep.amount,
      });

      if (rpcErr) {
        // Fallback transactional flow
        if (order.coupon_id) {
          const { data: couponRow } = await admin
            .from('coupons')
            .select('*')
            .eq('id', order.coupon_id)
            .single();

          if (couponRow) {
            await admin.from('coupon_redemptions').insert({
              coupon_id: order.coupon_id,
              user_id: profile.id,
              payment_order_id: order.id,
              discount_amount_usdt: order.discount_amount_usdt || '0.000000',
              redeemed_at: nowIso,
            });

            await admin
              .from('coupons')
              .update({
                redemption_count: (couponRow.redemption_count || 0) + 1,
                updated_at: nowIso,
              })
              .eq('id', order.coupon_id);
          }
        }

        // Update payment order to confirmed
        await admin
          .from('payment_orders')
          .update({
            status: 'confirmed',
            confirmed_at: nowIso,
            bybit_deposit_id: depId,
            tx_id: dep.txID,
            block_hash: dep.blockHash || null,
            confirmations: dep.confirmations ? parseInt(dep.confirmations, 10) : null,
            received_amount: dep.amount,
            failure_reason: null,
            updated_at: nowIso,
          })
          .eq('order_id', order.order_id);

        // Elevate user profile to ad_free
        await admin
          .from('profiles')
          .update({
            plan: 'ad_free',
            updated_at: nowIso,
          })
          .eq('id', profile.id);
      }

      return NextResponse.json({
        status: 'confirmed',
        isAdFree: true,
        orderId: order.order_id,
        txId: dep.txID,
        confirmedAt: nowIso,
        amount: order.payment_amount_usdt,
        originalPriceUsd: order.original_amount_usd || '2.00',
        finalPriceUsdt: order.final_amount_usdt || order.payment_amount_usdt,
        discountAmountUsdt: order.discount_amount_usdt || '0.000000',
        couponCode: order.coupon_code || null,
        currency: 'USDT',
        network: 'Polygon',
        message: 'Payment confirmed! Ad-Free status activated.',
      });
    }

    // 2. Detected on Blockchain (waiting for Bybit confirmation)
    if (match.matched && match.status === 'detected' && match.deposit) {
      const dep = match.deposit;

      await admin
        .from('payment_orders')
        .update({
          status: 'detected',
          detected_at: order.detected_at || nowIso,
          tx_id: dep.txID,
          confirmations: dep.confirmations ? parseInt(dep.confirmations, 10) : null,
          received_amount: dep.amount,
          updated_at: nowIso,
        })
        .eq('order_id', order.order_id);

      return NextResponse.json({
        status: 'detected',
        isAdFree: false,
        orderId: order.order_id,
        txId: dep.txID,
        message: 'Deposit detected on Polygon network; waiting for Bybit confirmation.',
        confirmations: dep.confirmations || '0',
      });
    }

    // 3. Late Payment (exact amount received after 20-minute window)
    if (match.matched && match.status === 'late_payment' && match.deposit) {
      const dep = match.deposit;

      await admin
        .from('payment_orders')
        .update({
          status: 'late_payment',
          tx_id: dep.txID,
          received_amount: dep.amount,
          failure_reason: 'Deposit arrived after 20-minute window expired',
          updated_at: nowIso,
        })
        .eq('order_id', order.order_id);

      return NextResponse.json({
        status: 'late_payment',
        isAdFree: false,
        orderId: order.order_id,
        txId: dep.txID,
        message: 'Payment was received after the 20-minute order window expired. Please contact support.',
      });
    }

    // 4. Amount Mismatch
    if (match.status === 'amount_mismatch' && match.deposit) {
      await admin
        .from('payment_orders')
        .update({
          status: 'amount_mismatch',
          tx_id: match.deposit.txID,
          received_amount: match.deposit.amount,
          failure_reason: match.reason || 'Amount mismatch',
          updated_at: nowIso,
        })
        .eq('order_id', order.order_id);

      return NextResponse.json({
        status: 'amount_mismatch',
        isAdFree: false,
        orderId: order.order_id,
        message: match.reason || 'A transfer with an incorrect amount was detected.',
      });
    }

    // 5. Expired Order (time elapsed without valid deposit)
    if (isPastExpiration) {
      if (order.status === 'pending') {
        await admin
          .from('payment_orders')
          .update({
            status: 'expired',
            failure_reason: '20-minute validity period expired without payment',
            updated_at: nowIso,
          })
          .eq('order_id', order.order_id);
      }

      return NextResponse.json({
        status: 'expired',
        isAdFree: false,
        orderId: order.order_id,
        message: 'Payment window expired. Please generate a new payment order.',
      });
    }

    // 6. Still Pending
    const remainingSeconds = Math.max(0, Math.floor((orderExpiresMs - nowMs) / 1000));
    return NextResponse.json({
      status: order.status,
      isAdFree: false,
      orderId: order.order_id,
      amount: order.payment_amount_usdt,
      currency: order.currency,
      network: order.network,
      destinationAddress: order.destination_address,
      expiresInSeconds: remainingSeconds,
      message: 'Waiting for transfer on Polygon network...',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error checking payment status' },
      { status: 500 }
    );
  }
}
