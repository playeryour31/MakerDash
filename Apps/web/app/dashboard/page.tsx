'use client';

import dynamic from 'next/dynamic';
import { DashboardListLoading } from '@/components/DashboardRouteLoading';

const DashboardClient = dynamic(() => import('./DashboardClient'), {
  loading: () => <DashboardListLoading />,
  ssr: false,
});

export default function DashboardPage() {
  return <DashboardClient />;
}
