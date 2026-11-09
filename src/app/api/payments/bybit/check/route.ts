import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminSupabaseClient } from '@/lib/supabase/server';
import { fetchBybitDeposits, matchDepositToOrder, fetchBybitInternalDeposits, matchInternalDepositToOrder, verifyBybitApiKeyIdentity, formatPaymentAmount } from '@/lib/payments/bybit';
import { fetchAptosUsdtDeposits, matchAptosDepositToOrder } from '@/lib/payments/aptos';
import { fetchTronTrc20Deposits, matchTronDepositToOrder } from '@/lib/payments/tron';
import { fetchPolygonUsdcTransfers, matchPolygonUsdcTransferToOrder } from '@/lib/payments/polygonUsdc';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';
import { fulfillPaymentOrder } from '@/lib/payments/subscriptionFulfillment';

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
    const customerTxId = searchParams.get('txId') || searchParams.get('tx_id') || searchParams.get('txid');
    const senderUid = searchParams.get('senderUid') || searchParams.get('sender_uid');

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
        amount: formatPaymentAmount(order.payment_amount_usdt),
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

    // Fail-closed guard: Reject verification for disabled or unsupported networks
    if (order.network !== 'Aptos' && order.network !== 'Polygon' && order.network !== 'TRON' && order.network !== 'Bybit_UID') {
      return NextResponse.json(
        {
          status: 'disabled',
          isAdFree: false,
          orderId: order.order_id,
          message: `Payment network "${order.network}" is not active for automated verification.`,
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // BYBIT UID INTERNAL TRANSFER VERIFICATION PATH
    // =========================================================================
    if (order.network === 'Bybit_UID') {
      // 1. Verify receiving account identity and read-only status independently via Bybit API
      const keyIdentity = await verifyBybitApiKeyIdentity();
      if (!keyIdentity.valid || !keyIdentity.isUidMatched) {
        // If API key identity fails or doesn't match configured receiving UID, fallback to review/Option B
        if (customerTxId && customerTxId.trim().length > 0) {
          await admin
            .from('payment_orders')
            .update({
              tx_id: customerTxId.trim(),
              failure_reason: 'Pending administrator review of Bybit internal transfer ID (API identity unverified)',
              updated_at: nowIso,
            })
            .eq('order_id', order.order_id);

          return NextResponse.json({
            status: order.status,
            isAdFree: false,
            orderId: order.order_id,
            txId: customerTxId.trim(),
            currency: 'USDT',
            network: 'Bybit_UID',
            destinationAddress: order.destination_address,
            pendingReview: true,
            message: 'Transaction ID submitted. Awaiting administrator verification against Bybit account history.',
          });
        }

        return NextResponse.json({
          status: order.status,
          isAdFree: false,
          orderId: order.order_id,
          currency: 'USDT',
          network: 'Bybit_UID',
          destinationAddress: order.destination_address,
          message: 'Waiting for Bybit internal transfer. If already sent, submit your Bybit Transaction ID (txID) below.',
          retryable: true,
        });
      }

      const depositsResult = await fetchBybitInternalDeposits({
        coin: 'USDT',
        startTime: Math.max(0, orderCreatedMs - 60000), // Allow 60s clock skew
        txID: customerTxId || undefined,
      });

      // If Bybit API credentials are not configured or request fails
      if (!depositsResult.success) {
        if (depositsResult.rateLimited) {
          return NextResponse.json({
            status: order.status,
            isAdFree: false,
            orderId: order.order_id,
            currency: 'USDT',
            network: 'Bybit_UID',
            destinationAddress: order.destination_address,
            retryAfter: 10,
            rateLimited: true,
            message: 'Payment verification gateway busy. Retrying automatically in a few seconds...',
          });
        }

        // Option B: If customer submitted a transaction ID, record it for admin review
        if (customerTxId && customerTxId.trim().length > 0) {
          await admin
            .from('payment_orders')
            .update({
              tx_id: customerTxId.trim(),
              failure_reason: 'Pending administrator review of Bybit internal transfer ID',
              updated_at: nowIso,
            })
            .eq('order_id', order.order_id);

          return NextResponse.json({
            status: order.status,
            isAdFree: false,
            orderId: order.order_id,
            txId: customerTxId.trim(),
            currency: 'USDT',
            network: 'Bybit_UID',
            destinationAddress: order.destination_address,
            pendingReview: true,
            message: 'Transaction ID submitted. Awaiting administrator verification against Bybit account history.',
          });
        }

        return NextResponse.json({
          status: order.status,
          isAdFree: false,
          orderId: order.order_id,
          currency: 'USDT',
          network: 'Bybit_UID',
          destinationAddress: order.destination_address,
          message: 'Waiting for Bybit internal transfer. If already sent, submit your Bybit Transaction ID (txID) below.',
          retryable: true,
        });
      }

      let eligibleInvoicesCount = 1;
      if (!customerTxId || customerTxId.trim().length === 0) {
        const { data: siblingOrders } = await admin
          .from('payment_orders')
          .select('order_id, created_at, expires_at')
          .eq('network', 'Bybit_UID')
          .eq('status', 'pending')
          .eq('payment_amount_usdt', order.payment_amount_usdt);

        if (siblingOrders && siblingOrders.length > 0) {
          const overlapping = siblingOrders.filter((o) => {
            const start = new Date(o.created_at).getTime();
            const end = new Date(o.expires_at).getTime();
            return start <= orderExpiresMs && end >= orderCreatedMs;
          });
          eligibleInvoicesCount = Math.max(1, overlapping.length);
        }
      }

      const match = matchInternalDepositToOrder(
        {
          payment_amount_usdt: order.payment_amount_usdt,
          destination_address: order.destination_address,
          created_at: order.created_at,
          expires_at: order.expires_at,
          sender_uid: senderUid,
        },
        depositsResult.rows,
        consumedSet,
        customerTxId,
        eligibleInvoicesCount
      );

      // 1. Confirmed Bybit UID Payment Match
      if (match.matched && match.status === 'confirmed' && match.deposit) {
        const dep = match.deposit;
        const depId = dep.txID || dep.id || `bybit_uid:${order.order_id}`;
        const txHash = dep.txID || depId;

        // Try atomic confirmation RPC first
        const { error: rpcErr } = await admin.rpc('confirm_payment_order', {
          p_order_id: order.order_id,
          p_bybit_deposit_id: depId,
          p_tx_id: txHash,
          p_block_hash: null,
          p_confirmations: 1,
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
              tx_id: txHash,
              confirmations: 1,
              received_amount: dep.amount,
              failure_reason: null,
              updated_at: nowIso,
            })
            .eq('order_id', order.order_id);

          // Elevate user profile according to purchased plan
          await fulfillPaymentOrder(admin, profile.id, order.product || 'ad_free', nowIso);
        }

        return NextResponse.json({
          status: 'confirmed',
          isAdFree: true,
          orderId: order.order_id,
          txId: txHash,
          confirmedAt: nowIso,
          amount: formatPaymentAmount(order.payment_amount_usdt),
          originalPriceUsd: formatPaymentAmount(order.original_amount_usd || '2.00'),
          finalPriceUsdt: formatPaymentAmount(order.final_amount_usdt || order.payment_amount_usdt),
          discountAmountUsdt: formatPaymentAmount(order.discount_amount_usdt || '0.0000'),
          couponCode: order.coupon_code || null,
          currency: 'USDT',
          network: 'Bybit_UID',
          message: 'Internal transfer confirmed on Bybit! Plan status activated.',
        });
      }

      // 2. Detected / Processing on Bybit
      if (match.matched && match.status === 'detected' && match.deposit) {
        return NextResponse.json({
          status: 'detected',
          isAdFree: false,
          orderId: order.order_id,
          txId: match.deposit.txID,
          currency: 'USDT',
          network: 'Bybit_UID',
          message: 'Internal transfer detected on Bybit. Processing confirmation.',
        });
      }

      // 3. Late Payment
      if (match.matched && match.status === 'late_payment' && match.deposit) {
        await admin
          .from('payment_orders')
          .update({
            status: 'late_payment',
            tx_id: match.deposit.txID,
            received_amount: match.deposit.amount,
            failure_reason: 'Transfer arrived after order expiration window',
            updated_at: nowIso,
          })
          .eq('order_id', order.order_id);

        return NextResponse.json({
          status: 'late_payment',
          isAdFree: false,
          orderId: order.order_id,
          txId: match.deposit.txID,
          network: 'Bybit_UID',
          message: 'Transfer was received on Bybit after the order window expired. Please contact support.',
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
            failure_reason: match.reason || 'Amount mismatch on Bybit internal transfer',
            updated_at: nowIso,
          })
          .eq('order_id', order.order_id);

        return NextResponse.json({
          status: 'amount_mismatch',
          isAdFree: false,
          orderId: order.order_id,
          network: 'Bybit_UID',
          message: match.reason || 'A transfer with an incorrect amount was detected on Bybit.',
        });
      }

      // 5. Ambiguous Payment / Pending Manual Review (multiple candidate deposits or missing sender UID/txID)
      if (match.status === 'ambiguous' || (match.status === 'pending' && match.ambiguous)) {
        await admin
          .from('payment_orders')
          .update({
            failure_reason: match.reason || 'Pending manual review: matching sender UID or verified txID required',
            updated_at: nowIso,
          })
          .eq('order_id', order.order_id);

        return NextResponse.json({
          status: 'pending',
          pendingReview: true,
          isAdFree: false,
          orderId: order.order_id,
          currency: 'USDT',
          network: 'Bybit_UID',
          destinationAddress: order.destination_address,
          message: match.reason || 'Payment detected on Bybit. Enter your Bybit Sender UID or submit your Transaction ID (txID) to complete verification.',
        });
      }

      // If customer submitted a txID but no matching row in Bybit API yet
      if (customerTxId && customerTxId.trim().length > 0) {
        return NextResponse.json({
          status: order.status,
          isAdFree: false,
          orderId: order.order_id,
          txId: customerTxId.trim(),
          currency: 'USDT',
          network: 'Bybit_UID',
          destinationAddress: order.destination_address,
          message: `Transaction ID "${customerTxId}" submitted. Awaiting verification or Bybit record settlement.`,
        });
      }

      // Expired check
      if (isPastExpiration) {
        if (order.status === 'pending') {
          await admin
            .from('payment_orders')
            .update({
              status: 'expired',
              failure_reason: 'Validity period expired without Bybit transfer',
              updated_at: nowIso,
            })
            .eq('order_id', order.order_id);
        }

        return NextResponse.json({
          status: 'expired',
          isAdFree: false,
          orderId: order.order_id,
          network: 'Bybit_UID',
          message: 'Payment window expired. Please generate a new order.',
        });
      }

      const remainingSeconds = Math.max(0, Math.floor((orderExpiresMs - nowMs) / 1000));
      return NextResponse.json({
        status: order.status,
        isAdFree: false,
        orderId: order.order_id,
        amount: formatPaymentAmount(order.payment_amount_usdt),
        currency: 'USDT',
        network: 'Bybit_UID',
        destinationAddress: order.destination_address,
        expiresInSeconds: remainingSeconds,
        message: 'Waiting for internal transfer on Bybit to recipient UID...',
      });
    }

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

          // Elevate user profile according to purchased plan
          await fulfillPaymentOrder(admin, profile.id, order.product || 'ad_free', nowIso);
        }

        return NextResponse.json({
          status: 'confirmed',
          isAdFree: true,
          orderId: order.order_id,
          txId: txHash,
          confirmedAt: nowIso,
          amount: formatPaymentAmount(order.payment_amount_usdt),
          originalPriceUsd: formatPaymentAmount(order.original_amount_usd || '2.00'),
          finalPriceUsdt: formatPaymentAmount(order.final_amount_usdt || order.payment_amount_usdt),
          discountAmountUsdt: formatPaymentAmount(order.discount_amount_usdt || '0.0000'),
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
        amount: formatPaymentAmount(order.payment_amount_usdt),
        currency: order.currency,
        network: 'Aptos',
        destinationAddress: order.destination_address,
        expiresInSeconds: remainingSeconds,
        message: 'Waiting for transfer on Aptos mainnet...',
      });
    }

    // =========================================================================
    // TRON (TRC20) VERIFICATION PATH
    // =========================================================================
    if (order.network === 'TRON') {
      const tronResult = await fetchTronTrc20Deposits({
        receivingAddress: order.destination_address,
        limit: 50,
        minTimestamp: Math.max(0, orderCreatedMs - 60000),
      });

      if (!tronResult.success) {
        return NextResponse.json({
          status: order.status,
          isAdFree: false,
          orderId: order.order_id,
          message: 'We are temporarily unable to verify TRON payments. Please wait and try again.',
          retryable: true,
        });
      }

      const match = await matchTronDepositToOrder(order, tronResult.transactions, consumedSet);

      if (match.matched && match.status === 'confirmed' && match.transaction) {
        const tx = match.transaction;
        const depId = match.depositId || `tron:${tx.transaction_id}`;
        const txHash = tx.transaction_id;
        const receivedAmount = (Number(tx.value) / 1000000).toFixed(6);

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

          await fulfillPaymentOrder(admin, profile.id, order.product || 'ad_free', nowIso);
        }

        return NextResponse.json({
          status: 'confirmed',
          isAdFree: true,
          orderId: order.order_id,
          txId: txHash,
          confirmedAt: nowIso,
          amount: formatPaymentAmount(order.payment_amount_usdt),
          originalPriceUsd: formatPaymentAmount(order.original_amount_usd || '2.00'),
          finalPriceUsdt: formatPaymentAmount(order.final_amount_usdt || order.payment_amount_usdt),
          discountAmountUsdt: formatPaymentAmount(order.discount_amount_usdt || '0.0000'),
          couponCode: order.coupon_code || null,
          currency: 'USDT',
          network: 'TRON',
          message: 'Payment confirmed on TRON network! Ad-Free status activated.',
        });
      }

      if (match.status === 'late_payment' && match.transaction) {
        const tx = match.transaction;
        const txHash = tx.transaction_id;
        const receivedAmount = (Number(tx.value) / 1000000).toFixed(6);

        await admin
          .from('payment_orders')
          .update({
            status: 'late_payment',
            tx_id: txHash,
            received_amount: receivedAmount,
            failure_reason: 'Deposit arrived after 20-minute window expired on TRON',
            updated_at: nowIso,
          })
          .eq('order_id', order.order_id);

        return NextResponse.json({
          status: 'late_payment',
          isAdFree: false,
          orderId: order.order_id,
          txId: txHash,
          network: 'TRON',
          message: 'Payment was received on TRON after the 20-minute order window expired. Please contact support.',
        });
      }

      if (match.status === 'amount_mismatch' && match.transaction) {
        const tx = match.transaction;
        const txHash = tx.transaction_id;
        const receivedAmount = (Number(tx.value) / 1000000).toFixed(6);

        await admin
          .from('payment_orders')
          .update({
            status: 'amount_mismatch',
            tx_id: txHash,
            received_amount: receivedAmount,
            failure_reason: match.reason || 'Amount mismatch on TRON',
            updated_at: nowIso,
          })
          .eq('order_id', order.order_id);

        return NextResponse.json({
          status: 'amount_mismatch',
          isAdFree: false,
          orderId: order.order_id,
          network: 'TRON',
          message: match.reason || 'A TRON transfer with an incorrect amount was detected.',
        });
      }

      if (isPastExpiration) {
        if (order.status === 'pending') {
          await admin
            .from('payment_orders')
            .update({
              status: 'expired',
              failure_reason: '20-minute validity period expired without TRON payment',
              updated_at: nowIso,
            })
            .eq('order_id', order.order_id);
        }

        return NextResponse.json({
          status: 'expired',
          isAdFree: false,
          orderId: order.order_id,
          network: 'TRON',
          message: 'Payment window expired. Please generate a new payment order.',
        });
      }

      const remainingSeconds = Math.max(0, Math.floor((orderExpiresMs - nowMs) / 1000));
      return NextResponse.json({
        status: order.status,
        isAdFree: false,
        orderId: order.order_id,
        amount: formatPaymentAmount(order.payment_amount_usdt),
        currency: 'USDT',
        network: 'TRON',
        destinationAddress: order.destination_address,
        expiresInSeconds: remainingSeconds,
        message: 'Waiting for transfer on TRON network (TRC20)...',
      });
    }

    // =========================================================================
    // POLYGON POS NATIVE USDC VERIFICATION PATH
    // =========================================================================
    if (order.network === 'Polygon' && order.currency === 'USDC') {
      const usdcResult = await fetchPolygonUsdcTransfers({
        receivingAddress: order.destination_address,
        fromBlockOffset: 1200,
      });

      if (!usdcResult.success) {
        return NextResponse.json({
          status: order.status,
          isAdFree: false,
          orderId: order.order_id,
          message: 'We are temporarily unable to verify Polygon USDC payments. Please wait and try again.',
          retryable: true,
        });
      }

      const match = await matchPolygonUsdcTransferToOrder(order, usdcResult.transfers, consumedSet);

      if (match.matched && match.status === 'confirmed' && match.transfer) {
        const transfer = match.transfer;
        const depId = match.depositId || `polygon_usdc:${transfer.txHash.toLowerCase()}`;
        const txHash = transfer.txHash;
        const receivedAmount = (Number(transfer.value) / 1000000).toFixed(6);

        // Try atomic confirmation RPC first
        const { error: rpcErr } = await admin.rpc('confirm_payment_order', {
          p_order_id: order.order_id,
          p_bybit_deposit_id: depId,
          p_tx_id: txHash,
          p_block_hash: null,
          p_confirmations: transfer.confirmations || 1,
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

          await admin
            .from('payment_orders')
            .update({
              status: 'confirmed',
              confirmed_at: nowIso,
              bybit_deposit_id: depId,
              tx_id: txHash,
              confirmations: transfer.confirmations || 1,
              received_amount: receivedAmount,
              failure_reason: null,
              updated_at: nowIso,
            })
            .eq('order_id', order.order_id);

          await fulfillPaymentOrder(admin, profile.id, order.product || 'ad_free', nowIso);
        }

        return NextResponse.json({
          status: 'confirmed',
          isAdFree: true,
          orderId: order.order_id,
          txId: txHash,
          confirmedAt: nowIso,
          amount: formatPaymentAmount(order.payment_amount_usdt),
          originalPriceUsd: formatPaymentAmount(order.original_amount_usd || '2.00'),
          finalPriceUsdt: formatPaymentAmount(order.final_amount_usdt || order.payment_amount_usdt),
          discountAmountUsdt: formatPaymentAmount(order.discount_amount_usdt || '0.0000'),
          couponCode: order.coupon_code || null,
          currency: 'USDC',
          network: 'Polygon',
          message: 'Payment confirmed on Polygon PoS (Native USDC)! Ad-Free status activated.',
        });
      }

      if (match.status === 'amount_mismatch' && match.transfer) {
        const transfer = match.transfer;
        const txHash = transfer.txHash;
        const receivedAmount = (Number(transfer.value) / 1000000).toFixed(6);

        await admin
          .from('payment_orders')
          .update({
            status: 'amount_mismatch',
            tx_id: txHash,
            received_amount: receivedAmount,
            failure_reason: match.reason || 'Amount mismatch on Polygon USDC',
            updated_at: nowIso,
          })
          .eq('order_id', order.order_id);

        return NextResponse.json({
          status: 'amount_mismatch',
          isAdFree: false,
          orderId: order.order_id,
          network: 'Polygon',
          currency: 'USDC',
          message: match.reason || 'A Polygon USDC transfer with an incorrect amount was detected.',
        });
      }

      if (isPastExpiration) {
        if (order.status === 'pending') {
          await admin
            .from('payment_orders')
            .update({
              status: 'expired',
              failure_reason: '20-minute validity period expired without Polygon USDC payment',
              updated_at: nowIso,
            })
            .eq('order_id', order.order_id);
        }

        return NextResponse.json({
          status: 'expired',
          isAdFree: false,
          orderId: order.order_id,
          network: 'Polygon',
          currency: 'USDC',
          message: 'Payment window expired. Please generate a new payment order.',
        });
      }

      const remainingSeconds = Math.max(0, Math.floor((orderExpiresMs - nowMs) / 1000));
      return NextResponse.json({
        status: order.status,
        isAdFree: false,
        orderId: order.order_id,
        amount: formatPaymentAmount(order.payment_amount_usdt),
        currency: 'USDC',
        network: 'Polygon',
        destinationAddress: order.destination_address,
        expiresInSeconds: remainingSeconds,
        message: 'Waiting for transfer on Polygon PoS (Native USDC)...',
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

        // Elevate user profile according to purchased plan
        await fulfillPaymentOrder(admin, profile.id, order.product || 'ad_free', nowIso);
      }

      return NextResponse.json({
        status: 'confirmed',
        isAdFree: true,
        orderId: order.order_id,
        txId: dep.txID,
        confirmedAt: nowIso,
        amount: formatPaymentAmount(order.payment_amount_usdt),
        originalPriceUsd: formatPaymentAmount(order.original_amount_usd || '2.00'),
        finalPriceUsdt: formatPaymentAmount(order.final_amount_usdt || order.payment_amount_usdt),
        discountAmountUsdt: formatPaymentAmount(order.discount_amount_usdt || '0.0000'),
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
      amount: formatPaymentAmount(order.payment_amount_usdt),
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
