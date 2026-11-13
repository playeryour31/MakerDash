'use client';

import dynamic from 'next/dynamic';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import LogsOnlyGuard from '@/components/logs/LogsOnlyGuard';

const LogsFeatureClient = dynamic(
  () => import('@/components/logs/LogsFeatureClient'),
  { loading: () => <BotPageSkeleton />, ssr: false },
);

export default function Page() {
  return (
    <LogsOnlyGuard>
      <LogsFeatureClient feature="messages" />
    </LogsOnlyGuard>
  );
}
