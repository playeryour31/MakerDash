'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Settings2 } from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
} from '@/components/apply/BotFormBits';
import {
  BotRuntimeBar,
  syncHomeBotRunning,
  type RuntimeBusy,
} from '@/components/dashboard/BotRuntimeBar';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { MuslimOverviewData } from './MuslimOverview';

const BotDiscordProfileEditor = dynamic(
  () => import('@/components/BotDiscordProfileEditor'),
  {
    loading: () => (
      <div className="h-52 animate-pulse rounded-2xl border border-border bg-card" />
    ),
    ssr: false,
  },
);

export default function MuslimSettingsClient() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const [data, setData] = useState<MuslimOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [runtimeBusy, setRuntimeBusy] = useState<RuntimeBusy>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<MuslimOverviewData>(`/muslim/${botId}`)
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

  async function setRuntime(action: 'start' | 'stop' | 'restart') {
    setRuntimeBusy(action);
    try {
      const body =
        action === 'restart'
          ? { restart: true }
          : { running: action === 'start' };
      const res = await api<{ running: boolean }>(`/muslim/${botId}/runtime`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const running = !!res.running;
      setData((prev) => (prev ? { ...prev, running } : prev));
      await syncHomeBotRunning(botId, running);
      toast.success(
        action === 'restart'
          ? t.azkar.restarted
          : action === 'start'
            ? t.azkar.started
            : t.azkar.stopped,
      );
    } catch {
      toast.error(t.settings.runtimeFailed);
    } finally {
      setRuntimeBusy(null);
    }
  }

  if (loading && !data) return <BotPageSkeleton />;
  if (loadError || !data) {
    return (
      <BotLoadError
        message={t.errors.loadBot}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <main className="dashboard-page settings-page space-y-6">
      <header className="settings-page-header">
        <div>
          <p className="settings-page-eyebrow">{t.muslim.badge}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t.muslim.settingsTitle}
          </h1>
          <p className="mt-1 max-w-[48ch] text-sm text-muted-foreground">
            {t.muslim.settingsSubtitle}
          </p>
        </div>

        <BotRuntimeBar
          running={Boolean(data.running)}
          busy={runtimeBusy}
          onStart={() => void setRuntime('start')}
          onStop={() => void setRuntime('stop')}
          onRestart={() => void setRuntime('restart')}
        />
      </header>

      <SectionCard title={t.azkar.profileTitle} icon={Settings2}>
        <p className="mb-4 text-sm text-muted-foreground">{t.azkar.profileBody}</p>
        <BotDiscordProfileEditor botId={botId} />
      </SectionCard>

      <div className="rounded-2xl border border-border bg-card/90 p-5">
        <p className="text-sm text-muted-foreground">{t.azkar.guild}</p>
        <code
          className="mt-2 block rounded-xl border border-border bg-muted/30 px-3 py-2 font-mono text-xs"
          dir="ltr"
        >
          {data.guildId || t.azkar.noGuild}
        </code>
      </div>
    </main>
  );
}
