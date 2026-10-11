'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/context/AuthContext';

/**
 * Route prefixes where advertisements must NEVER be loaded:
 * - Admin dashboards (/admin, /admin-setup)
 * - API routes (/api)
 * - Authentication pages (/login, /signup, /forgot-password, /reset-password, /auth)
 * - Private account and payment/checkout pages (/account, /choose-plan)
 */
export const EXCLUDED_AD_ROUTES = [
  '/admin',
  '/admin-setup',
  '/api',
  '/auth',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/account',
  '/choose-plan',
];

/**
 * Checks if a given pathname belongs to an excluded private/admin/auth/payment route.
 */
export function isRouteExcludedFromAds(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return EXCLUDED_AD_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Checks if the current environment is development or test or local preview.
 */
export function isLocalOrDevEnvironment(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local')
    ) {
      return true;
    }
  }
  return false;
}

interface MonetagZoneProps {
  isAdFree?: boolean;
}

/**
 * Monetag Advertising Zone 12002632
 * Loads https://al5sm.com/tag.min.js safely via next/script on public-facing pages only.
 * Suppressed for Ad-Free users, excluded routes, and dev/test environments.
 */
export function MonetagZone({ isAdFree = false }: MonetagZoneProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isClientLocal, setIsClientLocal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host.endsWith('.local')
      ) {
        setIsClientLocal(true);
      }
    }
  }, []);

  // Suppress ads on dev/test/local environments
  if (process.env.NODE_ENV !== 'production' || isClientLocal) {
    return null;
  }

  // Suppress ads for ad-free subscribers
  if (isAdFree || user?.plan === 'ad_free') {
    return null;
  }

  // Suppress ads on admin, auth, account, payment, and API routes
  if (isRouteExcludedFromAds(pathname)) {
    return null;
  }

  return (
    <Script
      id="monetag-zone-12002632"
      src="https://al5sm.com/tag.min.js"
      data-zone="12002632"
      data-cfasync="false"
      async
      strategy="afterInteractive"
    />
  );
}

export interface MonetagMainZoneProps {
  isAdFree?: boolean;
  src?: string;
  'data-zone'?: string;
  'data-cfasync'?: string;
  strategy?: 'afterInteractive' | 'lazyOnload' | 'beforeInteractive';
}

/**
 * Monetag Main Advertising Zone 289364
 * Loads https://quge5.com/88/tag.min.js safely via next/script on public-facing pages only.
 * Suppressed for Ad-Free users, excluded sensitive/private routes, and dev/test environments.
 */
export function MonetagMainZone({
  isAdFree = false,
  src = 'https://quge5.com/88/tag.min.js',
  'data-zone': dataZone = '289364',
  'data-cfasync': dataCfasync = 'false',
  strategy = 'afterInteractive',
}: MonetagMainZoneProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isClientLocal, setIsClientLocal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host.endsWith('.local')
      ) {
        setIsClientLocal(true);
      }
    }
  }, []);

  // Suppress ads on dev/test/local environments
  if (process.env.NODE_ENV !== 'production' || isClientLocal) {
    return null;
  }

  // Suppress ads for ad-free subscribers
  if (isAdFree || user?.plan === 'ad_free') {
    return null;
  }

  // Suppress ads on admin, auth, account, payment, and API routes
  if (isRouteExcludedFromAds(pathname)) {
    return null;
  }

  return (
    <Script
      id="monetag-main-zone-289364"
      src={src}
      data-zone={dataZone}
      data-cfasync={dataCfasync}
      async
      strategy={strategy}
    />
  );
}

