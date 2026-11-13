'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { BotSidebarPlaceholder } from '@/components/DashboardRouteLoading';
import { botRuntimeKey } from '@/components/dashboard/BotRuntimeBar';
import { useBotProduct } from '@/hooks/useBotProduct';
import { useMyBots } from '@/hooks/useAuthData';
import { api, getToken } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';

const BotSidebar = dynamic(
  () => import('@/components/BotSidebar').then((m) => m.default),
  {
    ssr: false,
    loading: () => <BotSidebarPlaceholder />,
  },
);

const BotMobileNav = dynamic(
  () => import('@/components/BotSidebar').then((m) => m.BotMobileNav),
  { ssr: false },
);

function runtimePath(botId: string, isMuslim: boolean, isSystem: boolean) {
  if (isMuslim) return `/muslim/${botId}`;
  if (isSystem) return `/system/${botId}`;
  return `/apply/${botId}`;
}

export default function BotDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { botId } = useParams<{ botId: string }>();
  const { t } = useI18n();
  const { isMuslim, isSystem, ready } = useBotProduct(botId);
  const { bots, loading: botsLoading } = useMyBots();

  const lockedBot = bots.find(
    (b) =>
      String(b.clientId) === String(botId) &&
      (b.locked || b.subscriptionStatus === 'grace'),
  );

  const { data: running = null } = useSWR(
    botId && ready && !lockedBot ? botRuntimeKey(String(botId)) : null,
    async () => {
      if (!getToken()) return null;
      const o = await api<{ running: boolean }>(
        runtimePath(String(botId), isMuslim, isSystem),
      );
      return !!o.running;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
      keepPreviousData: false,
    },
  );

  if (!botsLoading && lockedBot) {
    return (
      <div className="flex min-h-screen min-w-0 flex-1 items-center justify-center bg-background px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-destructive/25 bg-[#161018] p-6 text-center shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-bold uppercase tracking-wide text-destructive">
            {t.dashboard.statusExpired}
          </p>
          <h1 className="mt-3 font-display text-xl font-bold tracking-tight">
            {t.dashboard.lockedTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t.dashboard.lockedBody}
          </p>
          <Link
            href="/dashboard"
            className="ui-press mt-6 inline-flex items-center justify-center rounded-xl border border-primary/45 bg-primary/30 px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/45"
          >
            {t.dashboard.backToBots}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 flex-1 bg-background">
      <BotSidebar key={botId} running={running} />
      <div className="flex min-h-screen min-w-0 flex-col border-0 bg-background lg:ps-[280px]">
        <BotMobileNav key={`m-${botId}`} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
