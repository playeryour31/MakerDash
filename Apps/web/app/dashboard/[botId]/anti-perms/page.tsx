'use client';

import dynamic from 'next/dynamic';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import ProtectionOnlyGuard from '@/components/protection/ProtectionOnlyGuard';

const ProtectionHardeningClient = dynamic(
  () => import('@/components/protection/ProtectionHardeningClient'),
  { loading: () => <BotPageSkeleton />, ssr: false },
);

export default function Page() {
  return (
    <ProtectionOnlyGuard>
      <ProtectionHardeningClient feature="anti-perms" />
    </ProtectionOnlyGuard>
  );
}
