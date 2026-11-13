'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import ApplyOnlyGuard from '@/components/muslim/ApplyOnlyGuard';
import { useBotProduct } from '@/hooks/useBotProduct';

const OverviewAnalytics = dynamic(
  () => import('@/components/overview/OverviewAnalytics'),
  {
    loading: () => <BotPageSkeleton />,
    ssr: false,
  },
);

const SystemOverviewClient = dynamic(
  () => import('@/components/system/SystemOverviewClient'),
  {
    loading: () => <BotPageSkeleton />,
    ssr: false,
  },
);

const ProtectionOverviewClient = dynamic(
  () => import('@/components/protection/ProtectionOverviewClient'),
  {
    loading: () => <BotPageSkeleton />,
    ssr: false,
  },
);

const LogsOverviewClient = dynamic(
  () => import('@/components/logs/LogsOverviewClient'),
  {
    loading: () => <BotPageSkeleton />,
    ssr: false,
  },
);

/** Apply analytics OR System/Protection/Logs overview hub. Muslim → settings. */
export default function BotOverviewPage() {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();
  const { isMuslim, isSystem, isProtection, isLogs, ready } =
    useBotProduct(botId);

  useEffect(() => {
    if (!ready || !botId) return;
    if (isMuslim) {
      router.replace(`/dashboard/${botId}/settings`);
    }
  }, [ready, isMuslim, botId, router]);

  if (!ready) return <BotPageSkeleton />;
  if (isMuslim) return <BotPageSkeleton />;
  if (isSystem) return <SystemOverviewClient />;
  if (isProtection) return <ProtectionOverviewClient />;
  if (isLogs) return <LogsOverviewClient />;
  return (
    <ApplyOnlyGuard>
      <OverviewAnalytics botId={botId} />
    </ApplyOnlyGuard>
  );
}
