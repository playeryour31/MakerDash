'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Headphones,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Save,
  Settings2,
  Volume2,
} from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
  SelectField,
} from '@/components/apply/BotFormBits';
import UnsavedChangesBar from '@/components/UnsavedChangesBar';
import FeatureEnableCard from '@/components/FeatureEnableCard';
import { useToast } from '@/hooks/useToast';
import { useUnsavedDraft } from '@/hooks/useUnsavedDraft';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { quranT } from '@/lib/i18n/dictionaries';

function apiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  try {
    const parsed = JSON.parse(err.body);
    const msg = parsed?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string' && msg.trim()) return msg;
  } catch {
    /* ignore */
  }
  return err.body || fallback;
}

type QuranSettings = {
  voiceChannelId: string;
  radioId: string;
  radioName: string;
  radioUrl: string;
  volume: number;
  enabled: boolean;
  status?: 'idle' | 'playing' | 'reconnecting' | 'error';
  lastError?: string | null;
};

type QuranOverview = {
  botId: string;
  settings: QuranSettings | null;
  configured: boolean;
  playing: boolean;
  guildId: string | null;
};

type GuildOptions = {
  voiceChannels?: Array<{ id: string; name: string; type: number }>;
  channels: Array<{ id: string; name: string; type: number }>;
};

type RadioStation = { id: string; name: string; url: string };

type Draft = {
  voiceChannelId: string;
  radioId: string;
  radioName: string;
  radioUrl: string;
  volume: number;
  enabled: boolean;
};

const EMPTY: Draft = {
  voiceChannelId: '',
  radioId: '',
  radioName: '',
  radioUrl: '',
  volume: 80,
  enabled: true,
};

export default function QuranPlayerClient() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t, locale } = useI18n();
  const q = quranT(locale, t);
  const draft = useUnsavedDraft<Draft>(EMPTY);
  const [data, setData] = useState<QuranOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [controlBusy, setControlBusy] = useState(false);
  const [guildOpts, setGuildOpts] = useState<GuildOptions | null>(null);
  const [radios, setRadios] = useState<RadioStation[]>([]);
  const [radioQuery, setRadioQuery] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const refreshOverview = useCallback(async () => {
    const overview = await api<QuranOverview>(`/muslim/${botId}/quran`);
    setData(overview);
    return overview;
  }, [botId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<QuranOverview>(`/muslim/${botId}/quran`),
      api<{ radios: RadioStation[] }>(`/muslim/${botId}/quran/radios`).catch(
        () => ({ radios: [] as RadioStation[] }),
      ),
    ])
      .then(([overview, radioRes]) => {
        if (cancelled) return;
        setData(overview);
        setRadios(radioRes.radios || []);
        const s = overview.settings;
        draft.hydrate({
          voiceChannelId: s?.voiceChannelId || '',
          radioId: s?.radioId || '',
          radioName: s?.radioName || '',
          radioUrl: s?.radioUrl || '',
          volume: s?.volume ?? 80,
          enabled: s?.enabled !== false,
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
    if (!botId || !guildId) return;
    let cancelled = false;
    api<GuildOptions>(
      `/muslim/${botId}/guild-options?guildId=${encodeURIComponent(guildId)}`,
    )
      .then((opts) => {
        if (!cancelled) setGuildOpts(opts);
      })
      .catch(() => {
        if (!cancelled) setGuildOpts(null);
      });
    return () => {
      cancelled = true;
    };
  }, [botId, data?.guildId]);

  useEffect(() => {
    if (!botId || !hydrated) return;
    const status = data?.settings?.status;
    const fast =
      status === 'playing' ||
      status === 'reconnecting' ||
      data?.playing === true;
    const id = window.setInterval(() => {
      void refreshOverview().catch(() => {});
    }, fast ? 1500 : 4000);
    return () => window.clearInterval(id);
  }, [
    botId,
    hydrated,
    refreshOverview,
    data?.settings?.status,
    data?.playing,
  ]);

  const filteredRadios = useMemo(() => {
    const query = radioQuery.trim().toLowerCase();
    if (!query) return radios.slice(0, 100);
    return radios
      .filter((r) => r.name.toLowerCase().includes(query))
      .slice(0, 100);
  }, [radios, radioQuery]);

  const voiceOptions = (guildOpts?.voiceChannels || []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const voiceLabel =
    voiceOptions.find((v) => v.value === draft.draft.voiceChannelId)?.label ||
    draft.draft.voiceChannelId ||
    '—';

  const liveStatus =
    data?.settings?.status || (data?.playing ? 'playing' : 'idle');
  const isOnAir =
    liveStatus === 'playing' || liveStatus === 'reconnecting';

  function applyLocalSettings(next: QuranSettings, playingHint?: boolean) {
    draft.hydrate({
      voiceChannelId: next.voiceChannelId,
      radioId: next.radioId,
      radioName: next.radioName,
      radioUrl: next.radioUrl,
      volume: next.volume,
      enabled: next.enabled !== false,
    });
    setData((prev) =>
      prev
        ? {
            ...prev,
            settings: next,
            configured: Boolean(next.voiceChannelId && next.radioUrl),
            playing:
              playingHint ??
              (next.status === 'playing' || next.status === 'reconnecting'),
          }
        : prev,
    );
  }

  function bumpStatusPoll() {
    window.setTimeout(() => {
      void refreshOverview().catch(() => {});
    }, 600);
    window.setTimeout(() => {
      void refreshOverview().catch(() => {});
    }, 1800);
    window.setTimeout(() => {
      void refreshOverview().catch(() => {});
    }, 4000);
  }

  async function save(andPlay = false) {
    if (!draft.draft.radioUrl) {
      toast.error(q.needReciter);
      return;
    }
    if (!draft.draft.voiceChannelId) {
      toast.error(q.needVoice);
      return;
    }
    setSaving(true);
    try {
      const next = await api<QuranSettings>(`/muslim/${botId}/quran/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          voiceChannelId: draft.draft.voiceChannelId,
          radioId: draft.draft.radioId,
          radioName: draft.draft.radioName,
          radioUrl: draft.draft.radioUrl,
          volume: Number(draft.draft.volume) || 80,
          enabled: draft.draft.enabled,
          play: andPlay || undefined,
        }),
      });
      applyLocalSettings(next, andPlay ? true : undefined);
      toast.success(andPlay ? q.started : q.saved);
      if (andPlay) bumpStatusPoll();
    } catch (err) {
      toast.error(apiErrorMessage(err, andPlay ? q.controlFailed : q.saveFailed));
    } finally {
      setSaving(false);
    }
  }

  /** One-click play: push current draft to bot and start immediately */
  async function playNow() {
    if (!draft.draft.voiceChannelId) {
      toast.error(q.needVoice);
      return;
    }
    if (!draft.draft.radioUrl) {
      toast.error(q.needReciter);
      return;
    }
    setControlBusy(true);
    try {
      const next = await api<QuranSettings>(`/muslim/${botId}/quran/control`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'play',
          voiceChannelId: draft.draft.voiceChannelId,
          radioId: draft.draft.radioId,
          radioName: draft.draft.radioName,
          radioUrl: draft.draft.radioUrl,
          volume: Number(draft.draft.volume) || 80,
          enabled: true,
        }),
      });
      applyLocalSettings(
        {
          ...next,
          status: 'reconnecting',
          enabled: true,
          lastError: null,
        },
        true,
      );
      toast.success(q.started);
      bumpStatusPoll();
    } catch (err) {
      toast.error(apiErrorMessage(err, q.controlFailed));
    } finally {
      setControlBusy(false);
    }
  }

  async function stopNow() {
    setControlBusy(true);
    try {
      await api(`/muslim/${botId}/quran/control`, {
        method: 'POST',
        body: JSON.stringify({ action: 'stop' }),
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              playing: false,
              settings: prev.settings
                ? {
                    ...prev.settings,
                    enabled: false,
                    status: 'idle',
                    lastError: null,
                  }
                : prev.settings,
            }
          : prev,
      );
      draft.patch({ enabled: false });
      toast.success(q.stopped);
      bumpStatusPoll();
    } catch (err) {
      toast.error(apiErrorMessage(err, q.controlFailed));
    } finally {
      setControlBusy(false);
    }
  }

  /** Apply draft changes to a live session without a separate Save click */
  async function applyLive(partial?: Partial<Draft>) {
    const nextDraft = { ...draft.draft, ...partial };
    if (!nextDraft.voiceChannelId || !nextDraft.radioUrl) return;
    setControlBusy(true);
    try {
      const next = await api<QuranSettings>(`/muslim/${botId}/quran/control`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'live',
          voiceChannelId: nextDraft.voiceChannelId,
          radioId: nextDraft.radioId,
          radioName: nextDraft.radioName,
          radioUrl: nextDraft.radioUrl,
          volume: Number(nextDraft.volume) || 80,
          enabled: true,
        }),
      });
      applyLocalSettings(
        { ...next, status: 'reconnecting', enabled: true },
        true,
      );
      toast.success(q.applyLive);
      bumpStatusPoll();
    } catch (err) {
      toast.error(apiErrorMessage(err, q.controlFailed));
    } finally {
      setControlBusy(false);
    }
  }

  async function selectReciter(r: RadioStation) {
    const partial = {
      radioId: r.id,
      radioName: r.name,
      radioUrl: r.url,
    };
    draft.patch(partial);
    if (isOnAir || draft.draft.enabled) {
      await applyLive(partial);
    }
  }

  async function changeVoiceChannel(voiceChannelId: string) {
    draft.patch({ voiceChannelId });
    if ((isOnAir || draft.draft.enabled) && draft.draft.radioUrl) {
      await applyLive({ voiceChannelId });
    }
  }

  async function applyVolumeLive(volume: number) {
    draft.patch({ volume });
    try {
      await api(`/muslim/${botId}/quran/control`, {
        method: 'POST',
        body: JSON.stringify({ action: 'setVolume', volume }),
      });
    } catch {
      /* drag noise */
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

  const status = data.settings?.status || (data.playing ? 'playing' : 'idle');
  const statusLabel =
    status === 'playing'
      ? q.statusPlaying
      : status === 'reconnecting'
        ? q.statusReconnecting
        : status === 'error'
          ? q.statusError
          : q.statusIdle;

  const statusTone =
    status === 'playing'
      ? 'border-success/30 bg-success/10 text-success'
      : status === 'reconnecting'
        ? 'border-primary/30 bg-primary/10 text-brand-soft'
        : status === 'error'
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-border bg-muted/40 text-muted-foreground';

  const busy = saving || controlBusy;

  return (
    <main className="dashboard-page space-y-6 pb-28">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-soft">
            {t.nav.groupQuran}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
            {q.title}
          </h1>
          <p className="mt-1 max-w-[52ch] text-sm text-muted-foreground">
            {q.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshOverview()}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/40"
        >
          <RefreshCw size={14} />
          {q.refreshStatus}
        </button>
      </header>

      <FeatureEnableCard
        icon={Radio}
        title={q.enabled}
        description={q.enabledHint}
        enabled={draft.draft.enabled}
        enabledLabel={t.system?.enabled || 'Enabled'}
        disabledLabel={t.system?.disabled || 'Disabled'}
        switchAriaLabel={q.enabled}
        onEnabledChange={(enabled) => {
          draft.patch({ enabled });
          if (!enabled && (status === 'playing' || status === 'reconnecting')) {
            void stopNow();
          }
        }}
      />

      <SectionCard title={q.nowPlaying} icon={Headphones}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {draft.draft.radioName || q.noStation}
            </h2>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Radio size={14} className="text-brand-soft" />
              <span>{voiceLabel}</span>
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusTone}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'playing'
                  ? 'bg-success animate-pulse'
                  : status === 'reconnecting'
                    ? 'bg-brand-soft animate-pulse'
                    : status === 'error'
                      ? 'bg-destructive'
                      : 'bg-muted-foreground'
              }`}
            />
            {statusLabel}
          </span>
        </div>

        {data.settings?.lastError ? (
          <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <span className="font-semibold">{q.lastError}: </span>
            {data.settings.lastError}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {status === 'playing' || status === 'reconnecting' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void stopNow()}
              className="inline-flex min-w-[8.5rem] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted/40 disabled:opacity-50"
            >
              <Pause size={16} />
              {q.stop}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void playNow()}
              className="inline-flex min-w-[8.5rem] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-brand-soft px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
            >
              <Play size={16} />
              {q.play}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/20 px-3.5 py-2.5 text-sm font-semibold hover:bg-primary/30 disabled:opacity-50"
          >
            <Save size={15} />
            {q.saveAndPlay}
          </button>
          {draft.isDirty && (status === 'playing' || status === 'reconnecting') ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyLive()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2.5 text-sm font-semibold hover:bg-muted/40 disabled:opacity-50"
            >
              <RefreshCw size={15} />
              {q.applyLive}
            </button>
          ) : null}
        </div>

        <label className="mt-5 block text-sm">
          <span className="mb-2 inline-flex items-center gap-1.5 font-medium">
            <Volume2 size={15} className="text-brand-soft" />
            {q.volume}: {draft.draft.volume}%
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={draft.draft.volume}
            className="w-full accent-[var(--primary)]"
            onChange={(e) => {
              const volume = Number(e.target.value) || 0;
              draft.patch({ volume });
            }}
            onMouseUp={(e) => {
              const volume = Number((e.target as HTMLInputElement).value) || 0;
              void applyVolumeLive(volume);
            }}
            onTouchEnd={(e) => {
              const volume =
                Number((e.target as HTMLInputElement).value) || 0;
              void applyVolumeLive(volume);
            }}
          />
        </label>

        <p className="mt-3 text-xs text-muted-foreground">{q.reconnectHint}</p>
      </SectionCard>

      <SectionCard title={q.settingsTitle} icon={Settings2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={q.voiceChannel}
            value={draft.draft.voiceChannelId}
            onChange={(v) => void changeVoiceChannel(v)}
            options={
              voiceOptions.length
                ? voiceOptions
                : draft.draft.voiceChannelId
                  ? [
                      {
                        value: draft.draft.voiceChannelId,
                        label: draft.draft.voiceChannelId,
                      },
                    ]
                  : [{ value: '', label: q.selectVoice }]
            }
            hint={
              !data.guildId
                ? t.azkar.noGuild
                : voiceOptions.length
                  ? q.voiceHint
                  : q.noVoiceChannels
            }
          />
        </div>
      </SectionCard>

      <SectionCard title={q.reciter} icon={Radio} disabled={!draft.draft.enabled}>
        <p className="mb-3 text-sm text-muted-foreground">{q.reciterHint}</p>
        <input
          type="search"
          value={radioQuery}
          onChange={(e) => setRadioQuery(e.target.value)}
          placeholder={q.searchReciter}
          className="mb-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-border bg-background/30 p-2">
          {filteredRadios.map((r) => {
            const active = draft.draft.radioId === r.id;
            return (
              <button
                key={r.id}
                type="button"
                disabled={busy}
                onClick={() => void selectReciter(r)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition-colors disabled:opacity-60 ${
                  active
                    ? 'border border-primary/40 bg-primary/15 font-semibold text-foreground'
                    : 'border border-transparent hover:bg-muted/40'
                }`}
              >
                <span className="min-w-0 flex-1 leading-snug">{r.name}</span>
                {active ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                ) : null}
              </button>
            );
          })}
          {filteredRadios.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {q.selectReciter}
            </p>
          ) : null}
        </div>
      </SectionCard>

      <UnsavedChangesBar
        open={draft.isDirty}
        saving={saving}
        onSave={() => void save(false)}
        onDiscard={() => draft.discard()}
      />
    </main>
  );
}
