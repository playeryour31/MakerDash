'use client';

import dynamic from 'next/dynamic';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';

const CommandsClient = dynamic(() => import('./CommandsClient'), {
  loading: () => <BotPageSkeleton />,
  ssr: false,
});

export default function BotCommandsPage() {
  return <CommandsClient />;
}
