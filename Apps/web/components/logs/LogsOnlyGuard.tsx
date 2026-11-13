'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import { useBotProduct } from '@/hooks/useBotProduct';

/** Redirect non-Logs bots away from Logs Management routes. */
export default function LogsOnlyGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();
  const { isLogs, ready } = useBotProduct(botId);

  useEffect(() => {
    if (!ready || !botId) return;
    if (!isLogs) {
      router.replace(`/dashboard/${botId}/settings`);
    }
  }, [ready, isLogs, botId, router]);

  if (!ready) return <BotPageSkeleton />;
  if (!isLogs) return <BotPageSkeleton />;
  return <>{children}</>;
}
