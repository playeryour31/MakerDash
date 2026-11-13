'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Settings2, Sparkles } from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
  SelectField,
} from '@/components/apply/BotFormBits';
import {
  BotRuntimeBar,
  syncHomeBotRunning,
  type RuntimeBusy,
} from '@/components/dashboard/BotRuntimeBar';
import UnsavedChangesBar from '@/components/UnsavedChangesBar';
import FeatureEnableCard from '@/components/FeatureEnableCard';
import { useToast } from '@/hooks/useToast';
import { useUnsavedDraft } from '@/hooks/useUnsavedDraft';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { AzkarOverviewData } from './AzkarOverview';

const BotDiscordProfileEditor = dynamic(
  () => import('@/components/BotDiscordProfileEditor'),
  {
    loading: () => (
      <div className="h-52 animate-pulse rounded-2xl border border-border bg-card" />
    ),
    ssr: false,
  },
);

type GuildOptions = {
  channels: Array<{ id: string; name: string; type: number }>;
  roles: Array<{ id: string; name: string }>;
};

type AzkarDraft = {
  channelId: string;
  mode: 'embed' | 'message';
  enabled: boolean;
};

const EMPTY: AzkarDraft = {
  channelId: '',
  mode: 'embed',
  enabled: true,
};

export default function AzkarSettingsClient() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const draft = useUnsavedDraft<AzkarDraft>(EMPTY);
  const [data, setData] = useState<AzkarOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runtimeBusy, setRuntimeBusy] = useState<RuntimeBusy>(null);
  const [guildOpts, setGuildOpts] = useState<GuildOptions | null>(null);
  const [optsLoading, setOptsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    api<AzkarOverviewData>(`/azkar/${botId}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        draft.hydrate({
          channelId: res.settings?.Channel || '',
          mode: res.settings?.Mode === 'message' ? 'message' : 'embed',
          enabled: res.settings?.enabled !== false,
        });
        setHydrated(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId]);

  useEffect(() => {
    const guildId = data?.guildId;
    if (!botId || !guildId) {
      setGuildOpts(null);
      return;
    }
    let cancelled = false;
    setOptsLoading(true);
    api<GuildOptions>(
      `/azkar/${botId}/guild-options?guildId=${encodeURIComponent(guildId)}`,
    )
      .then((opts) => {
        if (!cancelled) setGuildOpts(opts);
      })
      .catch(() => {
        if (!cancelled) setGuildOpts(null);
      })
      .finally(() => {
        if (!cancelled) setOptsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [botId, data?.guildId]);

  async function save() {
    setSaving(true);
    try {
      const next = await api<AzkarOverviewData['settings']>(
        `/azkar/${botId}/settings`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            channelId: draft.draft.channelId,
            mode: draft.draft.mode,
            enabled: draft.draft.enabled,
          }),
        },
      );
      draft.hydrate({
        channelId: next?.Channel || draft.draft.channelId,
        mode: next?.Mode === 'message' ? 'message' : 'embed',
        enabled: next?.enabled !== false,
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              settings: next,
              configured: Boolean(next?.Channel),
            }
          : prev,
      );
      toast.success(t.azkar.saved);
    } catch {
      toast.error(t.azkar.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function setRuntime(action: 'start' | 'stop' | 'restart') {
    setRuntimeBusy(action);
    try {
      const body =
        action === 'restart'
          ? { restart: true }
          : { running: action === 'start' };
      const res = await api<{ running: boolean }>(`/azkar/${botId}/runtime`, {
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

  if (loading && !hydrated) return <BotPageSkeleton />;
  if (loadError || !data) {
    return (
      <BotLoadError
        message={t.errors.loadBot}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const channelOptions = (guildOpts?.channels || []).map((c) => ({
    value: c.id,
    label: `#${c.name}`,
  }));

  return (
    <main className="dashboard-page settings-page space-y-6 pb-28">
      <header className="settings-page-header">
        <div>
          <p className="settings-page-eyebrow">{t.azkar.badge}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t.azkar.settingsTitle}
          </h1>
          <p className="mt-1 max-w-[48ch] text-sm text-muted-foreground">
            {t.azkar.settingsSubtitle}
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

      <FeatureEnableCard
        icon={Sparkles}
        title={t.azkar.enabled}
        description={t.azkar.enabledHint}
        enabled={draft.draft.enabled}
        enabledLabel={t.system?.enabled || 'Enabled'}
        disabledLabel={t.system?.disabled || 'Disabled'}
        switchAriaLabel={t.azkar.enabled}
        onEnabledChange={(next) => draft.patch({ enabled: next })}
      />

      <SectionCard title={t.azkar.postsTitle} icon={Sparkles}>
        <p className="mb-4 text-sm text-muted-foreground">{t.azkar.postsBody}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={t.azkar.channel}
            value={draft.draft.channelId}
            onChange={(v) => draft.patch({ channelId: v })}
            options={
              channelOptions.length
                ? channelOptions
                : draft.draft.channelId
                  ? [
                      {
                        value: draft.draft.channelId,
                        label: draft.draft.channelId,
                      },
                    ]
                  : [{ value: '', label: t.azkar.selectChannel }]
            }
            hint={
              optsLoading
                ? t.azkar.loadingChannels
                : !data.guildId
                  ? t.azkar.noGuild
                  : t.azkar.channelHint
            }
          />
          <SelectField
            label={t.azkar.mode}
            value={draft.draft.mode}
            onChange={(v) =>
              draft.patch({ mode: v === 'message' ? 'message' : 'embed' })
            }
            options={[
              { value: 'embed', label: t.azkar.modeEmbed },
              { value: 'message', label: t.azkar.modeMessage },
            ]}
            hint={t.azkar.modeHint}
          />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">{t.azkar.intervalHint}</p>
      </SectionCard>

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

      <UnsavedChangesBar
        open={draft.isDirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => draft.discard()}
      />
    </main>
  );
}
