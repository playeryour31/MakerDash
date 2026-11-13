'use client';

import dynamic from 'next/dynamic';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import SystemOnlyGuard from '@/components/system/SystemOnlyGuard';

const LevelingClient = dynamic(
  () => import('@/components/system/leveling/LevelingClient'),
  { loading: () => <BotPageSkeleton />, ssr: false },
);

export default function SystemLevelingPage() {
  return (
    <SystemOnlyGuard>
      <LevelingClient />
    </SystemOnlyGuard>
  );
}
