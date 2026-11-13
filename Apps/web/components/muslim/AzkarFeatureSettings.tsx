'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
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
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';

type AzkarSettings = {
  Mode: 'embed' | 'message';
  Channel: string;
  enabled?: boolean;
  intervalMinutes?: number;
  slowdownSeconds?: number;
  selectedAzkar?: number[];
};

type AzkarData = {
  botId: string;
  running: boolean;
  guildId: string | null;
  settings: AzkarSettings | null;
};

type GuildOptions = {
  channels: Array<{ id: string; name: string; type: number }>;
};

type CatalogItem = { index: number; text: string };

type Draft = {
  channelId: string;
  mode: 'embed' | 'message';
  enabled: boolean;
  intervalMinutes: number;
  slowdownSeconds: number;
  selectedAzkar: number[];
};

const EMPTY: Draft = {
  channelId: '',
  mode: 'embed',
  enabled: true,
  intervalMinutes: 5,
  slowdownSeconds: 0,
  selectedAzkar: [],
};

export default function AzkarFeatureSettings() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const draft = useUnsavedDraft<Draft>(EMPTY);
  const [data, setData] = useState<AzkarData | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guildOpts, setGuildOpts] = useState<GuildOptions | null>(null);
  const [optsLoading, setOptsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [azkarQuery, setAzkarQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<AzkarData>(`/muslim/${botId}/azkar`),
      api<{ azkar: CatalogItem[] }>(`/muslim/${botId}/azkar/catalog`).catch(
        () => ({ azkar: [] as CatalogItem[] }),
      ),
    ])
      .then(([res, cat]) => {
        if (cancelled) return;
        setData(res);
        setCatalog(cat.azkar || []);
        const s = res.settings;
        draft.hydrate({
          channelId: s?.Channel || '',
          mode: s?.Mode === 'message' ? 'message' : 'embed',
          enabled: s?.enabled !== false,
          intervalMinutes: s?.intervalMinutes ?? 5,
          slowdownSeconds: s?.slowdownSeconds ?? 0,
          selectedAzkar: s?.selectedAzkar ?? [],
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
      `/muslim/${botId}/guild-options?guildId=${encodeURIComponent(guildId)}`,
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

  const filteredCatalog = useMemo(() => {
    const q = azkarQuery.trim().toLowerCase();
    if (!q) return catalog.slice(0, 120);
    return catalog.filter((a) => a.text.toLowerCase().includes(q)).slice(0, 120);
  }, [catalog, azkarQuery]);

  function toggleAzkar(index: number) {
    const set = new Set(draft.draft.selectedAzkar);
    if (set.has(index)) set.delete(index);
    else set.add(index);
    draft.patch({ selectedAzkar: Array.from(set).sort((a, b) => a - b) });
  }

  function selectAllVisible() {
    const set = new Set(draft.draft.selectedAzkar);
    for (const item of filteredCatalog) set.add(item.index);
    draft.patch({ selectedAzkar: Array.from(set).sort((a, b) => a - b) });
  }

  function clearSelection() {
    draft.patch({ selectedAzkar: [] });
  }

  async function save() {
    setSaving(true);
    try {
      const next = await api<AzkarSettings>(`/muslim/${botId}/azkar`, {
        method: 'PATCH',
        body: JSON.stringify({
          channelId: draft.draft.channelId,
          mode: draft.draft.mode,
          enabled: draft.draft.enabled,
          intervalMinutes: draft.draft.intervalMinutes,
          slowdownSeconds: draft.draft.slowdownSeconds,
          selectedAzkar: draft.draft.selectedAzkar,
        }),
      });
      draft.hydrate({
        channelId: next?.Channel || draft.draft.channelId,
        mode: next?.Mode === 'message' ? 'message' : 'embed',
        enabled: next?.enabled !== false,
        intervalMinutes: next?.intervalMinutes ?? 5,
        slowdownSeconds: next?.slowdownSeconds ?? 0,
        selectedAzkar: next?.selectedAzkar ?? [],
      });
      setData((prev) => (prev ? { ...prev, settings: next } : prev));
      toast.success(t.azkar.saved);
    } catch {
      toast.error(t.azkar.saveFailed);
    } finally {
      setSaving(false);
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

  const selectedCount =
    draft.draft.selectedAzkar.length > 0
      ? draft.draft.selectedAzkar.length
      : catalog.length;

  return (
    <main className="dashboard-page space-y-6 pb-28">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-soft">
          {t.nav.groupAzkar}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
          {t.azkar.settingsTitle}
        </h1>
        <p className="mt-1 max-w-[48ch] text-sm text-muted-foreground">
          {t.azkar.settingsSubtitle}
        </p>
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

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">{t.azkar.intervalMinutes}</span>
            <input
              type="number"
              min={1}
              max={1440}
              value={draft.draft.intervalMinutes}
              onChange={(e) =>
                draft.patch({
                  intervalMinutes: Math.max(
                    1,
                    Math.min(1440, Number(e.target.value) || 5),
                  ),
                })
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {t.azkar.intervalMinutesHint}
            </span>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">{t.azkar.slowdownSeconds}</span>
            <input
              type="number"
              min={0}
              max={3600}
              value={draft.draft.slowdownSeconds}
              onChange={(e) =>
                draft.patch({
                  slowdownSeconds: Math.max(
                    0,
                    Math.min(3600, Number(e.target.value) || 0),
                  ),
                })
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {t.azkar.slowdownSecondsHint}
            </span>
          </label>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">{t.azkar.intervalHint}</p>
      </SectionCard>

      <SectionCard
        title={t.azkar.azkarListTitle}
        icon={Sparkles}
        disabled={!draft.draft.enabled}
      >
        <p className="mb-3 text-sm text-muted-foreground">{t.azkar.azkarListBody}</p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={azkarQuery}
            onChange={(e) => setAzkarQuery(e.target.value)}
            placeholder={t.azkar.searchAzkar}
            className="min-w-[200px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={selectAllVisible}
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold"
          >
            {t.azkar.selectAllAzkar}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold"
          >
            {t.azkar.clearAzkar}
          </button>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          {t.azkar.selectedAzkarCount.replace('{count}', String(selectedCount))}
        </p>
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border bg-background/30 p-2">
          {filteredCatalog.map((item) => {
            const checked =
              draft.draft.selectedAzkar.length === 0 ||
              draft.draft.selectedAzkar.includes(item.index);
            const explicit =
              draft.draft.selectedAzkar.length > 0 &&
              draft.draft.selectedAzkar.includes(item.index);
            return (
              <label
                key={item.index}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                  checked={explicit || (draft.draft.selectedAzkar.length === 0 && checked)}
                  onChange={() => {
                    if (draft.draft.selectedAzkar.length === 0) {
                      draft.patch({
                        selectedAzkar: catalog
                          .map((c) => c.index)
                          .filter((i) => i !== item.index),
                      });
                    } else {
                      toggleAzkar(item.index);
                    }
                  }}
                />
                <span className="min-w-0 flex-1 leading-snug">{item.text}</span>
              </label>
            );
          })}
          {filteredCatalog.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              {t.common.loading}
            </p>
          ) : null}
        </div>
      </SectionCard>

      <UnsavedChangesBar
        open={draft.isDirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => draft.discard()}
      />
    </main>
  );
}
