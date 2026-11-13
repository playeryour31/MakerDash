'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import { useBotProduct } from '@/hooks/useBotProduct';

/** Redirects non-Apply product bots away from Apply-only routes. */
export default function ApplyOnlyGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();
  const { isMuslim, isSystem, ready } = useBotProduct(botId);
  const redirectAway = isMuslim || isSystem;

  useEffect(() => {
    if (!ready || !botId) return;
    if (redirectAway) {
      router.replace(`/dashboard/${botId}/settings`);
    }
  }, [ready, redirectAway, botId, router]);

  if (!ready) return <BotPageSkeleton />;
  if (redirectAway) return <BotPageSkeleton />;
  return <>{children}</>;
}
