'use client';

import { useEffect } from 'react';

/**
 * Client-side component that ensures AD-FREE users do not have the Monetag
 * service worker (/sw.js) actively registered in their browser.
 */
export function MonetagServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const reg of registrations) {
        const scriptUrl =
          reg.active?.scriptURL ||
          reg.installing?.scriptURL ||
          reg.waiting?.scriptURL ||
          '';

        if (scriptUrl.endsWith('/sw.js') || scriptUrl.includes('sw.js')) {
          reg.unregister().then(success => {
            if (success) {
              // Successfully unregistered Monetag service worker
            }
          }).catch(() => {
            // Ignore unregistration errors
          });
        }
      }
    }).catch(() => {});
  }, []);

  return null;
}
