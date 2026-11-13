'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BookOpen,
  Link2,
  MessageSquare,
  Power,
  RefreshCw,
  Settings2,
  Sparkles,
} from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
} from '@/components/apply/BotFormBits';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useToast } from '@/hooks/useToast';

export type AzkarOverviewData = {
  botId: string;
  type: string;
  running: boolean;
  guildId: string | null;
  configured: boolean;
  intervalMs: number;
  settings: {
    Mode: 'embed' | 'message';
    Channel: string;
    enabled?: boolean;
  } | null;
};

export default function AzkarOverview() {
  const { botId } = useParams<{ botId: string }>();
  const { t } = useI18n();
  const toast = useToast();
  const [data, setData] = useState<AzkarOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!botId) return;
    setLoadError(false);
    try {
      const res = await api<AzkarOverviewData>(`/azkar/${botId}`);
      setData(res);
    } catch {
      setLoadError(true);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [botId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  if (loading && !data) return <BotPageSkeleton />;
  if (loadError || !data) {
    return (
      <BotLoadError
        message={t.errors.loadBot}
        onRetry={() => {
          setLoading(true);
          void load();
        }}
      />
    );
  }

  const enabled = data.settings?.enabled !== false && data.configured;
  const modeLabel =
    data.settings?.Mode === 'message'
      ? t.azkar.modeMessage
      : data.settings?.Mode === 'embed'
        ? t.azkar.modeEmbed
        : '—';
  const intervalMin = Math.round((data.intervalMs || 300000) / 60000);

  return (
    <main className="dashboard-page space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-soft">
            {t.azkar.badge}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
            {t.azkar.overviewTitle}
          </h1>
          <p className="mt-1 max-w-[48ch] text-sm text-muted-foreground">
            {t.azkar.overviewSubtitle}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/40"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            void load();
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {t.common.refresh}
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Power}
          label={t.azkar.statusBot}
          value={data.running ? t.common.online : t.common.offline}
          tone={data.running ? 'success' : 'muted'}
        />
        <Kpi
          icon={Sparkles}
          label={t.azkar.statusPosts}
          value={enabled ? t.azkar.postsOn : t.azkar.postsOff}
          tone={enabled ? 'success' : 'muted'}
        />
        <Kpi
          icon={MessageSquare}
          label={t.azkar.mode}
          value={modeLabel}
          tone="primary"
        />
        <Kpi
          icon={BookOpen}
          label={t.azkar.interval}
          value={t.azkar.intervalValue.replace('{min}', String(intervalMin))}
          tone="primary"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t.azkar.configTitle} icon={Settings2}>
          <p className="mb-4 text-sm text-muted-foreground">{t.azkar.configBody}</p>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2">
              <dt className="text-muted-foreground">{t.azkar.channel}</dt>
              <dd className="font-mono text-xs" dir="ltr">
                {data.settings?.Channel || t.azkar.notConfigured}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2">
              <dt className="text-muted-foreground">{t.azkar.mode}</dt>
              <dd>{modeLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{t.azkar.guild}</dt>
              <dd className="font-mono text-xs" dir="ltr">
                {data.guildId || '—'}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/dashboard/${botId}/settings`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/20 px-3 py-2 text-sm font-semibold hover:bg-primary/30"
            >
              <Settings2 size={14} />
              {t.azkar.openSettings}
            </Link>
            <Link
              href={`/dashboard/${botId}/commands`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40"
            >
              {t.nav.commands}
            </Link>
          </div>
        </SectionCard>

        <SectionCard title={t.azkar.quickTitle} icon={Link2}>
          <p className="mb-4 text-sm text-muted-foreground">{t.azkar.quickBody}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• {t.azkar.hintChannel}</li>
            <li>• {t.azkar.hintMode}</li>
            <li>• {t.azkar.intervalHint}</li>
          </ul>
          {!data.configured ? (
            <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {t.azkar.notConfiguredHint}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40"
            onClick={async () => {
              try {
                const access = await api<{ dashboardUrl: string }>(
                  `/bots/${botId}/access`,
                  { method: 'POST' },
                );
                await navigator.clipboard.writeText(access.dashboardUrl);
                toast.success(t.dashboard.copy);
              } catch {
                toast.error(t.errors.copyLink);
              }
            }}
          >
            <Link2 size={14} />
            {t.dashboard.copy}
          </button>
        </SectionCard>
      </div>
    </main>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Power;
  label: string;
  value: string;
  tone: 'primary' | 'success' | 'muted';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-success/25 bg-success/10 text-success'
      : tone === 'muted'
        ? 'border-border bg-muted/30 text-muted-foreground'
        : 'border-primary/25 bg-primary/10 text-brand-soft';

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${toneClass}`}
        >
          <Icon size={15} />
        </span>
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-3 font-display text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}
