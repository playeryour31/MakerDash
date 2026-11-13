'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BookOpen,
  Headphones,
  Power,
  RefreshCw,
  Settings2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
} from '@/components/apply/BotFormBits';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { quranT } from '@/lib/i18n/dictionaries';

export type MuslimOverviewData = {
  botId: string;
  type: string;
  running: boolean;
  guildId: string | null;
  azkar: {
    settings: {
      Mode: 'embed' | 'message';
      Channel: string;
      enabled?: boolean;
    } | null;
    configured: boolean;
    intervalMs: number;
  };
  quran: {
    settings: {
      voiceChannelId: string;
      radioId: string;
      radioName: string;
      radioUrl: string;
      volume: number;
      enabled: boolean;
      status?: 'idle' | 'playing' | 'reconnecting' | 'error';
    } | null;
    configured: boolean;
    playing: boolean;
  };
};

export default function MuslimOverview() {
  const { botId } = useParams<{ botId: string }>();
  const { t, locale } = useI18n();
  const q = quranT(locale, t);
  const [data, setData] = useState<MuslimOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!botId) return;
    setLoadError(false);
    try {
      const res = await api<MuslimOverviewData>(`/muslim/${botId}`);
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

  const azkarOn =
    data.azkar.settings?.enabled !== false && data.azkar.configured;
  const quranStatus = data.quran.settings?.status || 'idle';
  const quranLabel =
    quranStatus === 'playing'
      ? q.statusPlaying
      : quranStatus === 'reconnecting'
        ? q.statusReconnecting
        : quranStatus === 'error'
          ? q.statusError
          : q.statusIdle;

  return (
    <main className="dashboard-page space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-soft">
            {t.muslim.badge}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
            {t.muslim.overviewTitle}
          </h1>
          <p className="mt-1 max-w-[52ch] text-sm text-muted-foreground">
            {t.muslim.overviewSubtitle}
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
          label={t.muslim.statusBot}
          value={data.running ? t.common.online : t.common.offline}
          tone={data.running ? 'success' : 'muted'}
        />
        <Kpi
          icon={Sparkles}
          label={t.muslim.statusAzkar}
          value={azkarOn ? t.azkar.postsOn : t.azkar.postsOff}
          tone={azkarOn ? 'success' : 'muted'}
        />
        <Kpi
          icon={Headphones}
          label={t.muslim.statusQuran}
          value={quranLabel}
          tone={
            quranStatus === 'playing'
              ? 'success'
              : quranStatus === 'error'
                ? 'muted'
                : 'primary'
          }
        />
        <Kpi
          icon={Volume2}
          label={t.muslim.currentReciter}
          value={data.quran.settings?.radioName || t.muslim.notSet}
          tone="primary"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t.muslim.azkarCardTitle} icon={BookOpen}>
          <p className="mb-4 text-sm text-muted-foreground">
            {t.muslim.azkarCardBody}
          </p>
          <dl className="mb-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t.azkar.channel}</dt>
              <dd className="font-mono text-xs" dir="ltr">
                {data.azkar.settings?.Channel || t.azkar.notConfigured}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t.azkar.mode}</dt>
              <dd>
                {data.azkar.settings?.Mode === 'message'
                  ? t.azkar.modeMessage
                  : data.azkar.settings?.Mode === 'embed'
                    ? t.azkar.modeEmbed
                    : '—'}
              </dd>
            </div>
          </dl>
          <Link
            href={`/dashboard/${botId}/azkar`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/20 px-3 py-2 text-sm font-semibold hover:bg-primary/30"
          >
            <Settings2 size={14} />
            {t.muslim.openAzkar}
          </Link>
        </SectionCard>

        <SectionCard title={t.muslim.quranCardTitle} icon={Headphones}>
          <p className="mb-4 text-sm text-muted-foreground">
            {t.muslim.quranCardBody}
          </p>
          <dl className="mb-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{q.voiceChannel}</dt>
              <dd className="font-mono text-xs" dir="ltr">
                {data.quran.settings?.voiceChannelId || t.azkar.notConfigured}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{q.volume}</dt>
              <dd>{data.quran.settings?.volume ?? 80}%</dd>
            </div>
          </dl>
          <Link
            href={`/dashboard/${botId}/quran`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/20 px-3 py-2 text-sm font-semibold hover:bg-primary/30"
          >
            <Headphones size={14} />
            {t.muslim.openQuran}
          </Link>
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
      <p className="mt-3 truncate font-display text-lg font-bold tracking-tight">
        {value}
      </p>
    </div>
  );
}
