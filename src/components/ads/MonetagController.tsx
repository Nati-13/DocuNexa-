'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isRouteExcludedFromAds } from './MonetagZone';

/**
 * Client-side component that ensures AD-FREE users and visitors on sensitive/private routes
 * do not have the Monetag service worker (/sw.js) actively registered, and removes any
 * lingering injected third-party ad DOM artifacts upon client-side navigation.
 */
export function MonetagServiceWorkerCleanup() {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const isAdFree = user?.plan === 'ad_free';
    const isExcluded = isRouteExcludedFromAds(pathname);

    // 1. Unregister Monetag service worker for ad-free users or when on excluded routes
    if ('serviceWorker' in navigator && (isAdFree || isExcluded)) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          const scriptUrl =
            reg.active?.scriptURL ||
            reg.installing?.scriptURL ||
            reg.waiting?.scriptURL ||
            '';

          if (scriptUrl.endsWith('/sw.js') || scriptUrl.includes('sw.js')) {
            reg.unregister().catch(() => {});
          }
        }
      }).catch(() => {});
    }

    // 2. Remove any dynamically injected Monetag popunder/push DOM nodes on sensitive routes
    if (isAdFree || isExcluded) {
      try {
        const injectedAds = document.querySelectorAll(
          '[id*="monetag"], [class*="monetag"], script[src*="quge5.com"], script[src*="al5sm.com"]'
        );
        injectedAds.forEach((el) => {
          // Remove dynamically injected nodes that are not the Next.js script declarations
          if (
            el.tagName !== 'SCRIPT' ||
            (!el.id?.includes('monetag-zone-') && !el.id?.includes('monetag-main-zone-'))
          ) {
            el.remove();
          }
        });
      } catch {
        // Ignore DOM removal errors
      }
    }
  }, [pathname, user]);

  return null;
}

