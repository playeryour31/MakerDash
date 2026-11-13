'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Hash,
  MessageSquareText,
  Mic,
  ScrollText,
  Settings2,
  Shield,
  Users,
} from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
} from '@/components/apply/BotFormBits';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { getDictionary } from '@/lib/i18n/dictionaries';

type GroupFlag = { id: string; enabled: number; total: number };

type OverviewData = {
  botId: string;
  running: boolean;
  guildId: string | null;
  features?: GroupFlag[];
  eventsEnabled?: number;
  eventsTotal?: number;
  general?: { defaultChannelId: string | null; defaultColor: string };
};

const GROUP_META: Record<
  string,
  {
    href: string;
    icon: typeof Users;
    titleKey: string;
    bodyKey: string;
  }
> = {
  members: {
    href: 'members',
    icon: Users,
    titleKey: 'members',
    bodyKey: 'membersBody',
  },
  messages: {
    href: 'messages',
    icon: MessageSquareText,
    titleKey: 'messages',
    bodyKey: 'messagesBody',
  },
  voice: {
    href: 'voice',
    icon: Mic,
    titleKey: 'voice',
    bodyKey: 'voiceBody',
  },
  roles: {
    href: 'roles',
    icon: Shield,
    titleKey: 'roles',
    bodyKey: 'rolesBody',
  },
  channels: {
    href: 'channels',
    icon: Hash,
    titleKey: 'channels',
    bodyKey: 'channelsBody',
  },
};

export default function LogsOverviewClient() {
  const { botId } = useParams<{ botId: string }>();
  const { t, locale } = useI18n();
  const L = t.logs ?? getDictionary(locale).logs;
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const dirChevron =
    locale === 'ar' ? (
      <ChevronLeft size={16} />
    ) : (
      <ChevronRight size={16} />
    );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<OverviewData>(`/logs/${botId}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [botId]);

  if (loading && !data) return <BotPageSkeleton />;
  if (loadError || !data) {
    return (
      <BotLoadError
        message={t.errors.loadBot}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const enabled = data.eventsEnabled ?? 0;
  const total = data.eventsTotal ?? 0;
  const base = `/dashboard/${botId}`;
  const groups =
    data.features && data.features.length > 0
      ? data.features
      : Object.keys(GROUP_META).map((id) => ({
          id,
          enabled: 0,
          total: 0,
        }));

  return (
    <main className="dashboard-page space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {L.badge}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {L.overviewTitle}
          </h1>
          <p className="mt-1 max-w-[52ch] text-sm text-muted-foreground">
            {L.overviewSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
              data.running
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-border bg-muted/40 text-muted-foreground'
            }`}
          >
            <i
              className={`size-1.5 rounded-full ${
                data.running ? 'bg-emerald-500' : 'bg-muted-foreground'
              }`}
            />
            {data.running ? L.online : L.offline}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground">
            <ScrollText size={12} />
            {L.eventsActive
              .replace('{enabled}', String(enabled))
              .replace('{total}', String(total))}
          </span>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SectionCard title={L.statusCard} icon={ScrollText}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{L.guild}</dt>
              <dd className="font-mono text-xs">
                {data.guildId || L.noGuild}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{L.defaultChannel}</dt>
              <dd className="text-xs">
                {data.general?.defaultChannelId
                  ? `#${data.general.defaultChannelId.slice(-6)}`
                  : L.notSet}
              </dd>
            </div>
          </dl>
          <Link
            href={`${base}/settings`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            <Settings2 size={14} />
            {L.openSettings}
            {dirChevron}
          </Link>
        </SectionCard>

        <SectionCard title={L.tipTitle} icon={Shield}>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {L.tipAudit}
          </p>
        </SectionCard>
      </div>

      <SectionCard title={L.groupsTitle} icon={Hash}>
        <p className="mb-4 text-sm text-muted-foreground">{L.groupsSubtitle}</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((flag) => {
            const meta = GROUP_META[flag.id];
            if (!meta) return null;
            const Icon = meta.icon;
            const pct =
              flag.total > 0
                ? Math.round((flag.enabled / flag.total) * 100)
                : 0;
            return (
              <Link
                key={flag.id}
                href={`${base}/${meta.href}`}
                className="group rounded-2xl border border-border bg-muted/20 p-4 transition hover:border-foreground/20 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground">
                    <Icon size={18} />
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {flag.enabled}/{flag.total} · {pct}%
                  </span>
                </div>
                <h3 className="mt-3 font-display text-base font-semibold tracking-tight">
                  {(L as Record<string, string>)[meta.titleKey]}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(L as Record<string, string>)[meta.bodyKey]}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground/80 opacity-80 group-hover:opacity-100">
                  {L.configure}
                  {dirChevron}
                </span>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </main>
  );
}
