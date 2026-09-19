'use client';

import React, { useEffect } from 'react';

export interface AdSlotProps {
  placement?: 'banner' | 'rectangle' | 'in-feed';
  format?: 'horizontal' | 'rectangle' | 'responsive';
  slotId?: string;
  className?: string;
}

/**
 * Accessible, privacy-conscious advertisement component.
 * Prevents cumulative layout shift (CLS) by reserving min-height.
 * Strictly avoids loading external scripts unless explicitly enabled with a valid client ID.
 * NEVER renders deceptive or disguised download buttons.
 */
export const AdSlot: React.FC<AdSlotProps> = ({
  placement,
  format,
  slotId,
  className = '',
}) => {
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
      : 'min-h-[90px]';

  useEffect(() => {
    if (!isRealProviderConfigured) return;

    // When a genuine provider like Google AdSense is configured, push ad safely
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch {
      // Gracefully ignore ad blocker or network errors
    }
  }, [isRealProviderConfigured, slotId]);

  return (
    <aside
      aria-label="Advertisement"
      className={`relative w-full rounded-2xl overflow-hidden transition-all duration-200 ${minHeightClass} ${className}`}
    >
      {/* Accessible Header Label */}
      <div className="text-center py-1 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
          Advertisement
        </span>
      </div>

      {isRealProviderConfigured ? (
        /* Real AdSense or Custom Ad Container */
        <div className="flex items-center justify-center p-3 bg-white dark:bg-slate-900">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', textAlign: 'center' }}
            data-ad-client={adClientId}
            data-ad-slot={slotId || '1234567890'}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      ) : (
        /* Clean, Neutral Unconfigured Development Placeholder */
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-b-2xl text-center">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            Sponsor Space
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-600 mt-0.5">
            DocuNexa is 100% free. Unobtrusive sponsors help support serverless hosting.
          </span>
        </div>
      )}
    </aside>
  );
};
