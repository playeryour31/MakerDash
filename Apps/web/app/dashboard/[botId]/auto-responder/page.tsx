'use client';

import dynamic from 'next/dynamic';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import SystemOnlyGuard from '@/components/system/SystemOnlyGuard';

const SystemFeatureClient = dynamic(
  () => import('@/components/system/SystemFeatureClient'),
  { loading: () => <BotPageSkeleton />, ssr: false },
);

export default function SystemAutoResponderPage() {
  return (
    <SystemOnlyGuard>
      <SystemFeatureClient feature="auto-responder" />
    </SystemOnlyGuard>
  );
}
