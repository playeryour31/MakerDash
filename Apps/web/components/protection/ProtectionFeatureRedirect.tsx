'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';

/** Redirect legacy protection feature routes → /systems?f=… */
export default function ProtectionFeatureRedirect({
  feature,
}: {
  feature: string;
}) {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!botId) return;
    router.replace(`/dashboard/${botId}/systems?f=${encodeURIComponent(feature)}`);
  }, [botId, feature, router]);

  return <BotPageSkeleton />;
}
