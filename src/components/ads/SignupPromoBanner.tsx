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
        className={`p-4 rounded-md bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-left ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-paper border border-border text-brand flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-ink leading-tight">
              Get More from DocuNexa
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Create your free account and make your document workflow easier.
            </p>
          </div>
        </div>

        <Link
          href="/signup"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-xs transition-colors shrink-0 cursor-pointer"
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
      className={`relative overflow-hidden rounded-md p-6 sm:p-8 bg-surface border border-border transition-colors ${className}`}
    >
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-paper border border-border text-brand text-xs font-semibold">
            <UserPlus size={14} className="text-brand" />
            <span>Free Account Benefits</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-ink">
            Get More from DocuNexa
          </h3>

          <p className="text-sm text-muted leading-relaxed">
            Create your free account and make your document workflow easier.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted pt-1">
            <span className="flex items-center gap-1 text-brand">
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-sm transition-colors cursor-pointer"
          >
            <span>Sign Up Free</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </aside>
  );
};
