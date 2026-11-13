'use client';

import dynamic from 'next/dynamic';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import ProtectionOnlyGuard from '@/components/protection/ProtectionOnlyGuard';

const ProtectionAutomodClient = dynamic(
  () => import('@/components/protection/ProtectionAutomodClient'),
  { loading: () => <BotPageSkeleton />, ssr: false },
);

export default function Page() {
  return (
    <ProtectionOnlyGuard>
      <ProtectionAutomodClient />
    </ProtectionOnlyGuard>
  );
}
