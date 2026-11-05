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
        className={`p-4 rounded-md bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-left ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-paper border border-border text-brand flex items-center justify-center shrink-0">
            <Zap size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-ink leading-tight">
                Enjoy DocuNexa Ad-Free
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand/10 border border-brand/20 text-brand">
                $2 One-Time
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Upgrade to the Ad-Free plan for a cleaner document workspace without advertising.
            </p>
          </div>
        </div>

        <Link
          href="/choose-plan"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-xs transition-colors shrink-0 cursor-pointer"
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
      className={`relative overflow-hidden rounded-md p-6 sm:p-8 bg-surface border border-border transition-colors ${className}`}
    >
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-paper border border-border text-brand text-xs font-semibold">
            <ShieldCheck size={14} className="text-brand" />
            <span>Ad-Free Upgrade • $2 One-Time</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-ink">
            Enjoy DocuNexa Ad-Free
          </h3>

          <p className="text-sm text-muted leading-relaxed">
            Upgrade to the Ad-Free plan for a cleaner document workspace without advertising.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted pt-1">
            <span className="flex items-center gap-1 text-brand">
              <Check size={14} /> Zero external advertisements
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-brand">
              <Check size={14} /> Clean, focused layout
            </span>
            <span>•</span>
            <span>One-time crypto payment</span>
          </div>
        </div>

        <div className="w-full sm:w-auto shrink-0 pt-2 md:pt-0">
          <Link
            href="/choose-plan"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-sm transition-colors cursor-pointer"
          >
            <span>Explore Ad-Free Plan</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </aside>
  );
};
