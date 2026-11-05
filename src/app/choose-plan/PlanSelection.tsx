'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Check, ShieldCheck, Zap, ArrowRight, Loader2, AlertCircle, Tag } from 'lucide-react';

export function PlanSelection() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<'free' | 'ad_free' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    formattedDiscount: string;
    originalAmountUsd: string;
    discountAmountUsdt: string;
    finalAmountUsdt: string;
  } | null>(null);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = couponCode.trim().toUpperCase();
    if (!trimmed) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid coupon code');
      }
      setAppliedCoupon({
        code: data.code,
        discountType: data.discountType,
        formattedDiscount: data.formattedDiscount,
        originalAmountUsd: data.originalAmountUsd,
        discountAmountUsdt: data.discountAmountUsdt,
        finalAmountUsdt: data.finalAmountUsdt,
      });
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSelectFree = async () => {
    setLoadingPlan('free');
    setError(null);

    try {
      const res = await fetch('/api/auth/choose-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'free' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm plan');
      }

      await refreshUser();
      router.push(data.redirect || '/account');
    } catch (err: any) {
      setError(err.message || 'Error selecting plan');
      setLoadingPlan(null);
    }
  };

  const handleSelectAdFree = async () => {
    setLoadingPlan('ad_free');
    setError(null);

    // If 100% coupon applied, execute immediate zero-cost order activation
    if (appliedCoupon && (appliedCoupon.finalAmountUsdt === '0.000000' || appliedCoupon.finalAmountUsdt === '0.0000')) {
      try {
        const res = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ couponCode: appliedCoupon.code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to activate coupon');
        await refreshUser();
        router.push('/account');
        return;
      } catch (err: any) {
        setError(err.message || 'Failed to activate zero-cost plan');
        setLoadingPlan(null);
        return;
      }
    }

    const couponParam = appliedCoupon?.code ? `&coupon=${encodeURIComponent(appliedCoupon.code)}` : '';
    router.push(`/account?checkout=ad_free${couponParam}`);
  };

  return (
    <div className="w-full max-w-4xl space-y-8 py-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-semibold">
          <Zap size={14} /> Account Created Successfully
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-ink">
          Choose Your DocuNexa Plan
        </h1>
        <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
          Choose how you would like to experience DocuNexa. You can always change or upgrade your plan anytime from your account settings.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="max-w-md mx-auto p-4 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto items-stretch">
        {/* PLAN 1 — FREE */}
        <div className="flex flex-col justify-between p-6 sm:p-8 rounded-md bg-surface border border-border shadow-subtle transition-colors">
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="font-serif text-2xl font-bold text-ink">FREE</h2>
              <p className="text-xs text-muted">
                Use DocuNexa for free.
              </p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-extrabold text-ink">$0</span>
            </div>

            <ul className="space-y-3 pt-4 border-t border-border text-sm text-ink">
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-brand shrink-0" />
                <span>Free PDF tools</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-brand shrink-0" />
                <span>No payment required</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-brand shrink-0" />
                <span>Supported by advertising</span>
              </li>
            </ul>
          </div>

          <div className="pt-8">
            <button
              onClick={handleSelectFree}
              disabled={loadingPlan !== null}
              className="w-full py-3.5 px-4 rounded-md bg-paper hover:bg-paper/80 border border-border text-ink font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loadingPlan === 'free' ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Setting up...
                </>
              ) : (
                <>
                  Continue Free <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* PLAN 2 — AD-FREE */}
        <div className="relative flex flex-col justify-between p-6 sm:p-8 rounded-md bg-surface border-2 border-brand shadow-subtle transition-colors">
          <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded bg-brand text-brand-fg text-[11px] font-bold tracking-wider uppercase">
            RECOMMENDED
          </div>

          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="font-serif text-2xl font-bold text-ink">AD-FREE</h2>
              <p className="text-xs text-muted">
                Use DocuNexa without advertisements.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                {appliedCoupon ? (
                  <>
                    <span className="text-4xl sm:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      ${Number(appliedCoupon.finalAmountUsdt).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted line-through">
                      ${appliedCoupon.originalAmountUsd}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      ({appliedCoupon.formattedDiscount})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl sm:text-5xl font-extrabold text-ink">$2</span>
                    <span className="text-xs text-muted font-medium">one-time</span>
                  </>
                )}
              </div>
              {appliedCoupon && Number(appliedCoupon.finalAmountUsdt) === 0 && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ 100% complimentary coupon applied! Instant free activation.
                </p>
              )}
            </div>

            <ul className="space-y-3 pt-4 border-t border-border text-sm text-ink">
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-emerald-500 shrink-0" />
                <span>Free PDF tools</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-emerald-500 shrink-0" />
                <span className="font-semibold text-ink">No Monetag advertising</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-emerald-500 shrink-0" />
                <span>{appliedCoupon && Number(appliedCoupon.finalAmountUsdt) === 0 ? 'Complimentary activation' : 'One-time crypto payment'}</span>
              </li>
            </ul>

            {/* Coupon Code Input */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted font-medium flex items-center gap-1">
                  <Tag size={12} /> Have a coupon code?
                </span>
                {appliedCoupon && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[11px]">
                    Applied: {appliedCoupon.code}
                  </span>
                )}
              </div>

              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="e.g. DOCUNEXA100well"
                  className="flex-1 px-3 py-2 rounded-md text-xs font-mono font-medium uppercase tracking-wider bg-paper border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-3.5 py-2 rounded-md text-xs font-semibold text-brand-fg bg-brand hover:bg-brand/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center min-w-[60px]"
                >
                  {couponLoading ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
                </button>
              </form>

              {couponError && (
                <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium">{couponError}</p>
              )}
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleSelectAdFree}
              disabled={loadingPlan !== null}
              className="w-full py-3.5 px-4 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loadingPlan === 'ad_free' ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Activating...
                </>
              ) : appliedCoupon && Number(appliedCoupon.finalAmountUsdt) === 0 ? (
                <>
                  <ShieldCheck size={18} /> Activate Free ($0.00)
                </>
              ) : (
                <>
                  <ShieldCheck size={18} /> Remove Ads — ${appliedCoupon ? appliedCoupon.finalAmountUsdt : '2'}
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-muted mt-2">
              {appliedCoupon && Number(appliedCoupon.finalAmountUsdt) === 0
                ? 'Zero-cost activation. Instant access with no payment required.'
                : 'Direct Bybit USDT transfer on Polygon or Aptos. No recurring fees.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
