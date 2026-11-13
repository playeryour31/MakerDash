'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import { useBotProduct } from '@/hooks/useBotProduct';

/** Redirect non-System bots away from System Management routes. */
export default function SystemOnlyGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();
  const { isSystem, ready } = useBotProduct(botId);

  useEffect(() => {
    if (!ready || !botId) return;
    if (!isSystem) {
      router.replace(`/dashboard/${botId}/settings`);
    }
  }, [ready, isSystem, botId, router]);

  if (!ready) return <BotPageSkeleton />;
  if (!isSystem) return <BotPageSkeleton />;
  return <>{children}</>;
}
