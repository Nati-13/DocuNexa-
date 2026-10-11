'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isRouteExcludedFromAds } from './MonetagZone';
import { Sparkles, ArrowRight, UserPlus, ShieldCheck } from 'lucide-react';

export interface SignupPromoBannerProps {
  className?: string;
  variant?: 'card' | 'compact' | 'inline';
}

/**
 * First-party promotional component encouraging logged-out visitors to create a free account.
 * Suppressed if the visitor is already signed in or on excluded/sensitive routes.
 */
export const SignupPromoBanner: React.FC<SignupPromoBannerProps> = ({
  className = '',
  variant = 'card',
}) => {
  const { user } = useAuth();
  const pathname = usePathname();

  // Never display to signed-in users
  if (user !== null) {
    return null;
  }

  // Never display on admin, auth, checkout, or private account pages
  if (isRouteExcludedFromAds(pathname)) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <aside
        aria-label="DocuNexa Registration Promotion"
        className={`p-4 rounded-2xl bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-left ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
              Get More from DocuNexa
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Create your free account and make your document workflow easier.
            </p>
          </div>
        </div>

        <Link
          href="/signup"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
        >
          <span>Sign Up Free</span>
          <ArrowRight size={14} />
        </Link>
      </aside>
    );
  }

  return (
    <aside
      aria-label="DocuNexa Registration Promotion"
      className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-brand-50/90 via-white to-indigo-50/80 dark:from-slate-900 dark:via-slate-900/90 dark:to-brand-950/40 border border-brand-200/70 dark:border-brand-800/70 shadow-sm transition-all ${className}`}
    >
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100/80 dark:bg-brand-950/70 border border-brand-300/60 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold">
            <UserPlus size={14} className="text-brand-600 dark:text-brand-400" />
            <span>Free Account Benefits</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Get More from DocuNexa
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Create your free account and make your document workflow easier.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={14} /> Save custom preferences
            </span>
            <span>•</span>
            <span>Zero payment required</span>
            <span>•</span>
            <span>Instant activation</span>
          </div>
        </div>

        <div className="w-full sm:w-auto shrink-0 pt-2 md:pt-0">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer"
          >
            <span>Sign Up Free</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </aside>
  );
};
