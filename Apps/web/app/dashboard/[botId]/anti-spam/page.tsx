'use client';

import dynamic from 'next/dynamic';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';
import ProtectionOnlyGuard from '@/components/protection/ProtectionOnlyGuard';

const ProtectionFeatureClient = dynamic(
  () => import('@/components/protection/ProtectionFeatureClient'),
  { loading: () => <BotPageSkeleton />, ssr: false },
);

export default function Page() {
  return (
    <ProtectionOnlyGuard>
      <ProtectionFeatureClient feature="anti-spam" />
    </ProtectionOnlyGuard>
  );
}
