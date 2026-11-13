'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { ToastProvider } from '@/components/ToastProvider';

const DashboardTopBar = dynamic(() => import('@/components/DashboardTopBar'), {
  ssr: false,
  loading: () => <div className="h-14 border-b border-border bg-card/40" aria-hidden />,
});

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showBuyerTopBar =
    pathname === '/dashboard' ||
    pathname === '/dashboard/' ||
    pathname === '/dashboard/profile' ||
    pathname.startsWith('/dashboard/profile/');

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-background">
        {showBuyerTopBar ? <DashboardTopBar /> : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ToastProvider>
  );
}
