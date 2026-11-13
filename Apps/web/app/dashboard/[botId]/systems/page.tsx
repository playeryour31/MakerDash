'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';

/** Legacy hub route → first systems page */
export default function Page() {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();
  useEffect(() => {
    if (botId) router.replace(`/dashboard/${botId}/anti-nuke`);
  }, [botId, router]);
  return <BotPageSkeleton />;
}
