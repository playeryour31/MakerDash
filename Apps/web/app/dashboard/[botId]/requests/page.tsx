'use client';

import dynamic from 'next/dynamic';
import ApplyOnlyGuard from '@/components/muslim/ApplyOnlyGuard';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';

const RequestsClient = dynamic(() => import('./RequestsClient'), {
  loading: () => <BotPageSkeleton />,
  ssr: false,
});

export default function BotRequestsPage() {
  return (
    <ApplyOnlyGuard>
      <RequestsClient />
    </ApplyOnlyGuard>
  );
}
