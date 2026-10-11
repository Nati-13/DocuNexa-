'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isRouteExcludedFromAds } from './MonetagZone';
import { ShieldCheck, ArrowRight, Zap, Check } from 'lucide-react';

export interface AdFreePromoBannerProps {
  className?: string;
  variant?: 'card' | 'compact' | 'in-feed';
}

/**
 * First-party promotional component promoting the existing $2 one-time Ad-Free plan.
 * Suppressed if the user is already on the ad_free plan or on excluded/sensitive routes.
 */
export const AdFreePromoBanner: React.FC<AdFreePromoBannerProps> = ({
  className = '',
  variant = 'card',
}) => {
  const { user } = useAuth();
  const pathname = usePathname();

  // Never display to users already on the Ad-Free plan
  if (user?.plan === 'ad_free') {
    return null;
  }

  // Never display on admin, auth, checkout, or private account pages
  if (isRouteExcludedFromAds(pathname)) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <aside
        aria-label="DocuNexa Ad-Free Upgrade Promotion"
        className={`p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-left ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                Enjoy DocuNexa Ad-Free
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                $2 One-Time
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Upgrade to the Ad-Free plan for a cleaner document workspace without advertising.
            </p>
          </div>
        </div>

        <Link
          href="/choose-plan"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
        >
          <span>Explore Ad-Free Plan</span>
          <ArrowRight size={14} />
        </Link>
      </aside>
    );
  }

  return (
    <aside
      aria-label="DocuNexa Ad-Free Upgrade Promotion"
      className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-50/80 via-white to-brand-50/70 dark:from-slate-900 dark:via-slate-900/90 dark:to-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 shadow-sm transition-all ${className}`}
    >
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-300/60 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Ad-Free Upgrade • $2 One-Time</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Enjoy DocuNexa Ad-Free
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Upgrade to the Ad-Free plan for a cleaner document workspace without advertising.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300 pt-1">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check size={14} /> Zero external advertisements
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> Clean, focused layout
            </span>
            <span>•</span>
            <span>One-time USDT payment</span>
          </div>
        </div>

        <div className="w-full sm:w-auto shrink-0 pt-2 md:pt-0">
          <Link
            href="/choose-plan"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer"
          >
            <span>Explore Ad-Free Plan</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </aside>
  );
};
