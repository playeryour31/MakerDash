'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import { useBotProduct } from '@/hooks/useBotProduct';

/** Redirect non-Protection bots away from Protection routes. */
export default function ProtectionOnlyGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();
  const { isProtection, ready } = useBotProduct(botId);

  useEffect(() => {
    if (!ready || !botId) return;
    if (!isProtection) {
      router.replace(`/dashboard/${botId}/settings`);
    }
  }, [ready, isProtection, botId, router]);

  if (!ready) return <BotPageSkeleton />;
  if (!isProtection) return <BotPageSkeleton />;
  return <>{children}</>;
}
