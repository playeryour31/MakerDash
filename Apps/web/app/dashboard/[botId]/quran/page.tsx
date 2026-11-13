'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import { useBotProduct } from '@/hooks/useBotProduct';

const QuranPlayerClient = dynamic(
  () => import('@/components/muslim/QuranPlayerClient'),
  {
    loading: () => <BotPageSkeleton />,
    ssr: false,
  },
);

export default function BotQuranPage() {
  const { botId } = useParams<{ botId: string }>();
  const { isMuslim, ready } = useBotProduct(botId);
  const router = useRouter();

  useEffect(() => {
    if (!ready || !botId) return;
    if (!isMuslim) router.replace(`/dashboard/${botId}/settings`);
  }, [ready, isMuslim, botId, router]);

  if (!ready) return <BotPageSkeleton />;
  if (!isMuslim) return <BotPageSkeleton />;
  return <QuranPlayerClient />;
}
