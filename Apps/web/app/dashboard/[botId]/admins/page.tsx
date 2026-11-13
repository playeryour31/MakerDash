'use client';

import dynamic from 'next/dynamic';
import ApplyOnlyGuard from '@/components/muslim/ApplyOnlyGuard';
import { BotPageSkeleton } from '@/components/apply/BotFormBits';

const AdminsClient = dynamic(() => import('./AdminsClient'), {
  loading: () => <BotPageSkeleton />,
  ssr: false,
});

export default function BotAdminsPage() {
  return (
    <ApplyOnlyGuard>
      <AdminsClient />
    </ApplyOnlyGuard>
  );
}
