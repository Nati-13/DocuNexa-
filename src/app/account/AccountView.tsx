'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Profile as User, DbPaymentOrder as PaymentOrder } from '@/lib/supabase/types';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  Sparkles,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { BybitPaymentModal, PaymentOrderData } from '@/components/payments/BybitPaymentModal';
import { formatPaymentAmount } from '@/lib/payments/format';

interface AccountViewProps {
  user: User;
  payments: PaymentOrder[];
}

export function AccountView({ user: initialUser, payments: initialPayments }: AccountViewProps) {
  const searchParams = useSearchParams();
  const { logout, refreshUser } = useAuth();

  const [user, setUser] = useState<User>(initialUser);
  const [payments, setPayments] = useState<PaymentOrder[]>(initialPayments);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<PaymentOrderData | null>(null);

  const checkoutParam = searchParams.get('checkout');
  const orderIdParam = searchParams.get('order_id');

  // Handle starting a crypto payment order (with optional coupon and method/network)
  const handleStartCheckout = useCallback(async (couponCode?: string, methodOrNetwork?: string) => {
    setCheckoutLoading(true);
    setCheckoutError(null);

    let networkParam = 'Polygon';
    let currencyParam = 'USDT';
    let methodParam = methodOrNetwork || 'polygon_usdt';

    if (methodOrNetwork === 'tron_usdt' || methodOrNetwork === 'TRON') {
      networkParam = 'TRON';
      currencyParam = 'USDT';
      methodParam = 'tron_usdt';
    } else if (methodOrNetwork === 'polygon_usdc' || methodOrNetwork === 'Polygon_USDC') {
      networkParam = 'Polygon';
      currencyParam = 'USDC';
      methodParam = 'polygon_usdc';
    } else if (methodOrNetwork === 'aptos_usdt' || methodOrNetwork === 'Aptos') {
      networkParam = 'Aptos';
      currencyParam = 'USDT';
      methodParam = 'aptos_usdt';
    }

    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode || undefined,
          network: networkParam,
          currency: currencyParam,
          method: methodParam,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start payment order');
      }

      if (data.alreadyPaid || data.zeroCost || data.activated) {
        setUser(prev => ({ ...prev, plan: 'ad_free' }));
        await refreshUser();
        setCheckoutLoading(false);
        setActiveOrder(null);
        return;
      }

      setActiveOrder({
        orderId: data.orderId,
        amount: data.amount,
        basePriceUsd: data.basePriceUsd || data.originalPriceUsd || '2.00',
        originalPriceUsd: data.originalPriceUsd || '2.00',
        finalPriceUsdt: data.finalPriceUsdt || data.amount,
        discountAmountUsdt: data.discountAmountUsdt || '0.000000',
        couponCode: data.couponCode || null,
        formattedDiscount: data.formattedDiscount || null,
        currency: data.currency || currencyParam,
        network: data.network || networkParam,
        destinationAddress: data.destinationAddress,
        expiresAt: data.expiresAt,
        expiresInSeconds: data.expiresInSeconds || 1200,
      });
    } catch (err: any) {
      setCheckoutError(err.message || 'Payment initiation failed');
    } finally {
      setCheckoutLoading(false);
    }
  }, [refreshUser]);

  const couponParam = searchParams.get('coupon');

  // If page was loaded with ?checkout=ad_free, open checkout automatically
  useEffect(() => {
    if (checkoutParam === 'ad_free' && user.plan !== 'ad_free') {
      handleStartCheckout(couponParam || undefined);
    }
  }, [checkoutParam, couponParam, user.plan, handleStartCheckout]);

  // If orderId was in URL, check status
  useEffect(() => {
    if (orderIdParam) {
      fetch(`/api/payments/bybit/check?orderId=${encodeURIComponent(orderIdParam)}`)
        .then(res => res.json())
        .then(data => {
          if (data.isAdFree) {
            setUser(prev => ({ ...prev, plan: 'ad_free' }));
            refreshUser();
          }
        })
        .catch(() => {});
    }
  }, [orderIdParam, refreshUser]);

  const handleOrderConfirmed = async () => {
    setUser(prev => ({ ...prev, plan: 'ad_free' }));
    await refreshUser();
    setActiveOrder(null);
    // Refresh payment list
    window.location.reload();
  };

  const isAdFree = user.plan === 'ad_free';

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-ink">
            Your Account
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage your account entitlement, plan preferences, and payment records.
          </p>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <LogOut size={14} /> Log Out
        </button>
      </div>

      {/* Account & Plan Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="p-6 rounded-md bg-surface border border-border shadow-subtle space-y-4">
          <h2 className="font-serif text-base font-bold text-ink">
            Profile Information
          </h2>

          <div className="space-y-3 text-sm">
            <div>
              <span className="block text-xs font-semibold text-muted uppercase tracking-wider">
                Email
              </span>
              <p className="text-ink font-medium break-all mt-0.5">
                {user.email}
              </p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-muted uppercase tracking-wider">
                Member Since
              </span>
              <p className="text-ink mt-0.5">
                {new Date(user.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Current Plan Card */}
        <div className="p-6 rounded-md bg-surface border border-border shadow-subtle space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-base font-bold text-ink">
                Current Plan
              </h2>

              {isAdFree ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 size={13} /> AD-FREE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-paper border border-border text-muted text-xs font-bold">
                  FREE
                </span>
              )}
            </div>

            {isAdFree ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink">
                  ✓ Advertising Disabled
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  Your DocuNexa account currently has advertising disabled. You have unlimited access to every PDF tool with zero Monetag ads.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted leading-relaxed">
                  You are using DocuNexa for free with advertisements enabled. Ads help support our free client-side processing infrastructure.
                </p>
              </div>
            )}
          </div>

          {!isAdFree && (
            <div className="pt-4 border-t border-border">
              {checkoutError && (
                <div className="mb-3 p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              <button
                onClick={() => handleStartCheckout()}
                disabled={checkoutLoading}
                className="w-full py-3 px-4 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Generating Order...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Remove Ads — $2
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-muted mt-1.5">
                $2.00 USD one-time crypto payment on Polygon, Aptos, or TRON. Never billed again.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment History Section */}
      <div className="p-6 rounded-md bg-surface border border-border shadow-subtle space-y-4">
        <h2 className="font-serif text-base font-bold text-ink flex items-center gap-2">
          <Clock size={18} className="text-brand" /> Payment History
        </h2>

        {payments.length === 0 ? (
          <p className="text-xs text-muted py-3">
            No transactions on file.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Original</th>
                  <th className="py-2.5 px-3">Coupon</th>
                  <th className="py-2.5 px-3">Paid Amount</th>
                  <th className="py-2.5 px-3">Network</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-ink">
                {payments.map(p => {
                  const isConfirmed = p.status === 'confirmed';
                  const isDetected = p.status === 'detected';
                  const isPending = p.status === 'pending';
                  const isExpired = p.status === 'expired';

                  return (
                    <tr key={p.id} className="hover:bg-paper/50">
                      <td className="py-3 px-3 whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-ink">
                        {p.order_id}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted">
                        ${formatPaymentAmount(p.original_amount_usd || '2.00')}
                      </td>
                      <td className="py-3 px-3">
                        {p.coupon_code ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-mono font-bold text-[10px]">
                              {p.coupon_code}
                            </span>
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                              -{formatPaymentAmount(p.discount_amount_usdt || '0.0000')} {p.currency || 'USDT'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-ink font-mono">
                        {formatPaymentAmount(p.payment_amount_usdt)} {p.currency || 'USDT'}
                      </td>
                      <td className="py-3 px-3">
                        {p.network === 'Aptos' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 font-medium text-[11px]">
                            Aptos
                          </span>
                        ) : p.network === 'TRON' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-[11px]">
                            TRON
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand/10 border border-brand/20 text-brand font-medium text-[11px]">
                            Polygon
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                            <CheckCircle2 size={11} /> Confirmed
                          </span>
                        ) : isDetected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                            <RefreshCw size={11} className="animate-spin" /> Detected
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                            <Clock size={11} /> Pending
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-paper border border-border text-muted text-[11px]">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-semibold text-[11px]">
                            {p.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {p.tx_id ? (
                          <a
                            href={
                              p.network === 'Aptos'
                                ? `https://explorer.aptoslabs.com/txn/${p.tx_id}?network=mainnet`
                                : `https://polygonscan.com/tx/${p.tx_id}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-brand hover:underline"
                          >
                            {p.tx_id.slice(0, 8)}... <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive USDT Payment Modal */}
      {activeOrder && (
        <BybitPaymentModal
          order={activeOrder}
          onClose={() => setActiveOrder(null)}
          onConfirmed={handleOrderConfirmed}
          onNewOrder={(code, net) => handleStartCheckout(code, net)}
        />
      )}
    </div>
  );
}
