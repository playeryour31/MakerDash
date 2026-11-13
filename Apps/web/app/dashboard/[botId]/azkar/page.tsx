'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import { useBotProduct } from '@/hooks/useBotProduct';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AzkarFeatureSettings = dynamic(
  () => import('@/components/muslim/AzkarFeatureSettings'),
  {
    loading: () => <BotPageSkeleton />,
    ssr: false,
  },
);

export default function BotAzkarPage() {
  const { botId } = useParams<{ botId: string }>();
  const { isMuslim, ready } = useBotProduct(botId);
  const router = useRouter();

  useEffect(() => {
    if (!ready || !botId) return;
    if (!isMuslim) router.replace(`/dashboard/${botId}/settings`);
  }, [ready, isMuslim, botId, router]);

  if (!ready) return <BotPageSkeleton />;
  if (!isMuslim) return <BotPageSkeleton />;
  return <AzkarFeatureSettings />;
}
