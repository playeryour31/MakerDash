'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import { useBotProduct } from '@/hooks/useBotProduct';

const SettingsClient = dynamic(() => import('./SettingsClient'), {
  loading: () => <BotPageSkeleton />,
  ssr: false,
});

const MuslimSettingsClient = dynamic(
  () => import('@/components/muslim/MuslimSettingsClient'),
  {
    loading: () => <BotPageSkeleton />,
    ssr: false,
  },
);

const SystemSettingsClient = dynamic(
  () => import('@/components/system/SystemSettingsClient'),
  {
    loading: () => <BotPageSkeleton />,
    ssr: false,
  },
);

const ProtectionSettingsClient = dynamic(
  () => import('@/components/protection/ProtectionSettingsClient'),
  {
    loading: () => <BotPageSkeleton />,
    ssr: false,
  },
);

const LogsSettingsClient = dynamic(
  () => import('@/components/logs/LogsSettingsClient'),
  {
    loading: () => <BotPageSkeleton />,
    ssr: false,
  },
);

export default function BotSettingsPage() {
  const { botId } = useParams<{ botId: string }>();
  const { isMuslim, isSystem, isProtection, isLogs, ready } =
    useBotProduct(botId);

  if (!ready) return <BotPageSkeleton />;
  if (isMuslim) return <MuslimSettingsClient />;
  if (isSystem) return <SystemSettingsClient />;
  if (isProtection) return <ProtectionSettingsClient />;
  if (isLogs) return <LogsSettingsClient />;
  return <SettingsClient />;
}
