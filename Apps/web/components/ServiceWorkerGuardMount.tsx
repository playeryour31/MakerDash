'use client';

import dynamic from 'next/dynamic';

/**
 * Next 16 only allows `ssr: false` inside Client Components. The root layout is
 * a Server Component (it exports metadata), so the browser-only service-worker
 * guard is mounted through this tiny client boundary instead.
 */
const ServiceWorkerGuard = dynamic(
  () => import('@/components/ServiceWorkerGuard'),
  { ssr: false },
);

export default function ServiceWorkerGuardMount() {
  return <ServiceWorkerGuard />;
}
