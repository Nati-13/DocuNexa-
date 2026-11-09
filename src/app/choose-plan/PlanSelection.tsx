'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Check, ShieldCheck, Zap, ArrowRight, Loader2, AlertCircle, Tag, Sparkles, Clock, Globe } from 'lucide-react';
import { PLAN_CATALOG, PlanId, getPlan, isUserAdFree, isUserPro } from '@/lib/planCatalog';

export function PlanSelection() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
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

  const isGrandfathered = user?.plan === 'ad_free';
  const currentAdFree = isUserAdFree(user?.plan, user?.subscription_expires_at);
  const currentPro = isUserPro(user?.plan, user?.subscription_expires_at);

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

  const handleSelectPaidPlan = async (planId: PlanId) => {
    setLoadingPlan(planId);
    setError(null);

    // If 100% coupon applied, execute immediate zero-cost order activation
    if (appliedCoupon && (appliedCoupon.finalAmountUsdt === '0.000000' || appliedCoupon.finalAmountUsdt === '0.0000')) {
      try {
        const res = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId, couponCode: appliedCoupon.code }),
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
    router.push(`/account?checkout=${planId}${couponParam}`);
  };

  // Resolve standard & pro plans for active billing cycle
  const standardPlanId: PlanId =
    billingCycle === 'weekly' ? 'weekly' : billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const proPlanId: PlanId =
    billingCycle === 'weekly' ? 'weekly_pro' : billingCycle === 'yearly' ? 'yearly_pro' : 'monthly_pro';

  const standardPlan = getPlan(standardPlanId);
  const proPlan = getPlan(proPlanId);

  return (
    <div className="w-full max-w-5xl space-y-8 py-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-semibold">
          <Zap size={14} /> Flexible Document Plans
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-ink">
          Choose Your DocuNexa Plan
        </h1>
        <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
          Select between our ad-supported free tier or distraction-free subscription plans with zero automated card rebills.
        </p>

        {/* Grandfathered Banner */}
        {isGrandfathered && (
          <div className="max-w-md mx-auto p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            ✨ Your account has grandfathered Lifetime Ad-Free access. You can upgrade to a Pro plan for early-access features, or keep your permanent lifetime ad removal.
          </div>
        )}
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

      {/* Billing Cycle Switcher */}
      <div className="flex justify-center items-center gap-2 pt-2">
        <div className="inline-flex p-1 rounded-lg bg-paper border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setBillingCycle('weekly')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              billingCycle === 'weekly' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              billingCycle === 'monthly' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Monthly
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-bold">
              Save 25%
            </span>
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              billingCycle === 'yearly' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Yearly
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">
              Provisional &bull; Save 25%
            </span>
          </button>
        </div>
      </div>

      {billingCycle === 'yearly' && (
        <div className="max-w-md mx-auto p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-center text-xs text-amber-800 dark:text-amber-300">
          ⚠️ <strong>Provisional Rate:</strong> Yearly plans offer an additional 25% savings over monthly billing, pending final rate authorization.
        </div>
      )}

      {/* Plan Cards Grid: FREE, STANDARD, PRO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* PLAN 1 — FREE */}
        <div className="flex flex-col justify-between p-6 rounded-md bg-surface border border-border shadow-subtle transition-colors">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-ink">FREE</h2>
              <p className="text-xs text-muted">Core tools for everyone.</p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-ink">$0</span>
              <span className="text-xs text-muted">/ forever</span>
            </div>

            <ul className="space-y-2.5 pt-4 border-t border-border text-xs text-ink">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-brand shrink-0" />
                <span>All 34 core PDF tools</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-brand shrink-0" />
                <span>Client-side PDF Unit Cutter</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-brand shrink-0" />
                <span>Zero payment required</span>
              </li>
              <li className="flex items-center gap-2 text-muted">
                <Check size={14} className="text-muted shrink-0" />
                <span>Supported by advertising</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={handleSelectFree}
              disabled={loadingPlan !== null}
              className="w-full py-2.5 px-4 rounded-md bg-paper hover:bg-paper/80 border border-border text-ink font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loadingPlan === 'free' ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Setting up...
                </>
              ) : (
                <>
                  Continue Free <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* PLAN 2 — STANDARD AD-FREE (Weekly $1 / Monthly $3 / Yearly $27) */}
        <div className="relative flex flex-col justify-between p-6 rounded-md bg-surface border-2 border-brand shadow-subtle transition-colors">
          {standardPlan.savingsDisplay && (
            <div className="absolute -top-3 right-4 px-2 py-0.5 rounded bg-brand text-brand-fg text-[10px] font-bold tracking-wider uppercase">
              {standardPlan.savingsDisplay}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-ink">{standardPlan.name.toUpperCase()}</h2>
                <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-brand/10 text-brand">Ad-Free</span>
              </div>
              <p className="text-xs text-muted">Distraction-free document processing.</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-ink">{standardPlan.formattedPrice}</span>
                <span className="text-xs text-muted">{standardPlan.periodLabel}</span>
              </div>
            </div>

            <ul className="space-y-2.5 pt-4 border-t border-border text-xs text-ink">
              <li className="flex items-center gap-2 font-medium">
                <Check size={14} className="text-brand shrink-0" />
                <span>100% Ad-Free on all tools</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-brand shrink-0" />
                <span>Full access to all PDF tools</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-brand shrink-0" />
                <span>Manual renewal via USDT, USDC, or Bybit UID</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-brand shrink-0" />
                <span>No recurring credit card charges</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectPaidPlan(standardPlan.id)}
              disabled={loadingPlan !== null}
              className="w-full py-2.5 px-4 rounded-md bg-brand hover:opacity-90 text-brand-fg font-semibold text-xs transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loadingPlan === standardPlan.id ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Preparing checkout...
                </>
              ) : (
                <>
                  {standardPlan.ctaLabel} <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* PLAN 3 — PRO (Weekly $2 / Monthly $6 / Yearly $54) */}
        <div className="relative flex flex-col justify-between p-6 rounded-md bg-surface border border-border hover:border-brand/50 shadow-subtle transition-colors">
          {proPlan.badge && (
            <div className="absolute -top-3 right-4 px-2 py-0.5 rounded bg-ink text-surface text-[10px] font-bold tracking-wider uppercase">
              {proPlan.badge}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-ink">{proPlan.name.toUpperCase()}</h2>
                <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                  Pro Access
                </span>
              </div>
              <p className="text-xs text-muted">Early access and priority tools.</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-ink">{proPlan.formattedPrice}</span>
                <span className="text-xs text-muted">{proPlan.periodLabel}</span>
              </div>
            </div>

            <ul className="space-y-2.5 pt-4 border-t border-border text-xs text-ink">
              <li className="flex items-center gap-2 font-medium">
                <Sparkles size={14} className="text-brand shrink-0" />
                <span>Early access to future tools</span>
              </li>
              <li className="flex items-center gap-2 font-medium">
                <Check size={14} className="text-brand shrink-0" />
                <span>100% Ad-Free on all tools</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-brand shrink-0" />
                <span>Priority feature access</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-brand shrink-0" />
                <span>Manual renewal via USDT, USDC, or Bybit UID</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectPaidPlan(proPlan.id)}
              disabled={loadingPlan !== null}
              className="w-full py-2.5 px-4 rounded-md bg-ink hover:opacity-90 text-surface font-semibold text-xs transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loadingPlan === proPlan.id ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Preparing checkout...
                </>
              ) : (
                <>
                  {proPlan.ctaLabel} <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Coupon Form & Payment Rail Notice */}
      <div className="max-w-md mx-auto pt-4 space-y-4">
        <form onSubmit={handleApplyCoupon} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Promo or coupon code"
              className="flex-1 px-3 py-2 border border-border rounded-md bg-surface text-ink text-xs focus:outline-hidden focus:ring-1 focus:ring-brand font-mono uppercase"
            />
            <button
              type="submit"
              disabled={couponLoading || !couponCode.trim()}
              className="px-4 py-2 rounded-md bg-paper border border-border text-xs font-semibold text-ink hover:bg-surface transition-colors disabled:opacity-50 cursor-pointer"
            >
              {couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
            </button>
          </div>

          {appliedCoupon && (
            <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag size={12} /> Code <strong>{appliedCoupon.code}</strong> applied: {appliedCoupon.formattedDiscount}
              </span>
            </div>
          )}

          {couponError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{couponError}</p>
          )}
        </form>

        <div className="p-3.5 rounded-md bg-paper border border-border text-center space-y-1 text-2xs text-muted">
          <div className="flex items-center justify-center gap-1.5 font-semibold text-ink">
            <Globe size={13} className="text-brand" /> Supported Crypto Rails: USDT (Polygon, Aptos, TRON), USDC (Polygon), and Bybit UID
          </div>
          <p>
            Renewals are manual payments using your preferred wallet or exchange transfer (0 fees on Bybit UID). DocuNexa never performs automated card rebills or surprise charges.
          </p>
        </div>
      </div>
    </div>
  );
}
