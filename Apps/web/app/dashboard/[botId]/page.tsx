'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import { useBotProduct } from '@/hooks/useBotProduct';

/** Default landing: Muslim → settings, System → overview, Apply → overview. */
export default function BotIndexRedirect() {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();
  const { isMuslim, isSystem, isProtection, ready } = useBotProduct(botId);

  useEffect(() => {
    if (!ready || !botId) return;
    router.replace(
      isMuslim
        ? `/dashboard/${botId}/settings`
        : `/dashboard/${botId}/overview`,
    );
  }, [ready, isMuslim, isSystem, isProtection, botId, router]);

  return <BotPageSkeleton />;
}
