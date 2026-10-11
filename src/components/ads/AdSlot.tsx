'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isRouteExcludedFromAds } from './MonetagZone';
import { SignupPromoBanner } from './SignupPromoBanner';
import { AdFreePromoBanner } from './AdFreePromoBanner';

export interface AdSlotProps {
  placement?: 'banner' | 'rectangle' | 'in-feed';
  format?: 'horizontal' | 'rectangle' | 'responsive';
  slotId?: string;
  className?: string;
  promoVariant?: 'signup' | 'ad_free' | 'auto';
}

/**
 * Accessible, privacy-conscious advertisement and first-party house promotion component.
 * Prevents cumulative layout shift (CLS) by reserving min-height.
 * Strictly avoids loading external scripts unless explicitly enabled with a valid client ID.
 * Collapses completely for authenticated Ad-Free users and excluded sensitive routes.
 * When external ad networks are unconfigured, displays DocuNexa's first-party house promotions.
 */
export const AdSlot: React.FC<AdSlotProps> = ({
  placement,
  format,
  slotId,
  className = '',
  promoVariant = 'auto',
}) => {
  const { user } = useAuth();
  const pathname = usePathname();

  // Collapses completely for authenticated Ad-Free users
  if (user?.plan === 'ad_free') {
    return null;
  }

  // Suppress on sensitive/auth/admin/payment routes
  if (isRouteExcludedFromAds(pathname)) {
    return null;
  }

  const effectivePlacement: 'banner' | 'rectangle' | 'in-feed' =
    placement || (format === 'rectangle' ? 'rectangle' : format === 'responsive' ? 'in-feed' : 'banner');

  const isAdsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';
  const adProvider = process.env.NEXT_PUBLIC_ADS_PROVIDER || 'none';
  const adClientId = process.env.NEXT_PUBLIC_ADS_CLIENT_ID || '';

  const isRealProviderConfigured = isAdsEnabled && adProvider !== 'none' && adClientId.trim().length > 0;

  const minHeightClass =
    effectivePlacement === 'rectangle'
      ? 'min-h-[250px]'
      : effectivePlacement === 'in-feed'
      ? 'min-h-[120px]'
      : 'min-h-[80px]';

  useEffect(() => {
    if (!isRealProviderConfigured) return;

    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch {
      // Gracefully ignore ad blocker or network errors
    }
  }, [isRealProviderConfigured, slotId]);

  // When third-party ad network is active, render external ad unit
  if (isRealProviderConfigured) {
    return (
      <aside
        aria-label="Advertisement"
        className={`relative w-full rounded-2xl overflow-hidden transition-all duration-200 ${minHeightClass} ${className}`}
      >
        <div className="text-center py-1 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
            Advertisement
          </span>
        </div>
        <div className="flex items-center justify-center p-3 bg-white dark:bg-slate-900">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', textAlign: 'center' }}
            data-ad-client={adClientId}
            data-ad-slot={slotId || ''}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </aside>
    );
  }

  // First-party house promotion routing
  const showSignupPromo =
    promoVariant === 'signup' || (promoVariant === 'auto' && !user && slotId !== 'home-footer-banner');

  return (
    <div className={`w-full transition-all duration-200 ${className}`}>
      {showSignupPromo ? (
        <SignupPromoBanner variant={effectivePlacement === 'rectangle' ? 'card' : 'compact'} />
      ) : (
        <AdFreePromoBanner variant={effectivePlacement === 'rectangle' ? 'card' : 'compact'} />
      )}
    </div>
  );
};
