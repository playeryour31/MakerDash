'use client';

import { useEffect } from 'react';

/**
 * Dev-only: unregister stale service workers so HMR isn't blocked.
 * Production keeps Workbox caches (next.config.js PWA) for fast repeat visits.
 */
export default function ServiceWorkerGuard() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isLocal) return;

    let cancelled = false;

    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch {
        /* ignore */
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
