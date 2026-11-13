'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Settings2 } from 'lucide-react';
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
import GuildPresenceBanner from '@/components/GuildPresenceBanner';
import UnsavedChangesBar from '@/components/UnsavedChangesBar';
import { useToast } from '@/hooks/useToast';
import { useUnsavedDraft } from '@/hooks/useUnsavedDraft';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { getDictionary } from '@/lib/i18n/dictionaries';

type OverviewData = {
  botId: string;
  type: string;
  running: boolean;
  guildId: string | null;
};

type GuildOptions = {
  guildId?: string;
  inGuild?: boolean;
  code?: string;
  inviteUrl?: string | null;
  channels: Array<{ id: string; name: string; type: number }>;
};

type GeneralDraft = {
  defaultChannelId: string;
  defaultColor: string;
};

const EMPTY: GeneralDraft = { defaultChannelId: '', defaultColor: 'Green' };

const COLOR_OPTIONS = [
  'Green',
  'Red',
  'Blue',
  'Orange',
  'Yellow',
  'Purple',
  'Blurple',
  'Gold',
  'Aqua',
  'White',
];

const BotDiscordProfileEditor = dynamic(
  () => import('@/components/BotDiscordProfileEditor'),
  {
    loading: () => (
      <div className="h-52 animate-pulse rounded-2xl border border-border bg-card" />
    ),
    ssr: false,
  },
);

export default function LogsSettingsClient() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t, locale } = useI18n();
  const L = t.logs ?? getDictionary(locale).logs;
  const [data, setData] = useState<OverviewData | null>(null);
  const [guild, setGuild] = useState<GuildOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [runtimeBusy, setRuntimeBusy] = useState<RuntimeBusy>(null);
  const [saving, setSaving] = useState(false);
  const draft = useUnsavedDraft<GeneralDraft>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<OverviewData>(`/logs/${botId}`),
      api<{ defaultChannelId: string | null; defaultColor: string }>(
        `/logs/${botId}/features/general`,
      ),
      api<GuildOptions>(`/apply/${botId}/guild-options`).catch(() => null),
    ])
      .then(([overview, general, guildOpts]) => {
        if (cancelled) return;
        setData(overview);
        draft.hydrate({
          defaultChannelId: general.defaultChannelId || '',
          defaultColor: general.defaultColor || 'Green',
        });
        setGuild(guildOpts);
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

  async function setRuntime(action: 'start' | 'stop' | 'restart') {
    setRuntimeBusy(action);
    try {
      const body =
        action === 'restart'
          ? { restart: true }
          : { running: action === 'start' };
      const res = await api<{ running: boolean }>(`/logs/${botId}/runtime`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const running = !!res.running;
      setData((prev) => (prev ? { ...prev, running } : prev));
      await syncHomeBotRunning(botId, running);
      toast.success(
        action === 'restart'
          ? L.restarted
          : action === 'start'
            ? L.started
            : L.stopped,
      );
    } catch {
      toast.error(t.settings.runtimeFailed);
    } finally {
      setRuntimeBusy(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api(`/logs/${botId}/features/general`, {
        method: 'PATCH',
        body: JSON.stringify({
          defaultChannelId: draft.draft.defaultChannelId || null,
          defaultColor: draft.draft.defaultColor || 'Green',
        }),
      });
      draft.commit(draft.draft);
      toast.success(L.saved);
    } catch {
      toast.error(t.errors.generic);
    } finally {
      setSaving(false);
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

  const textChannels = (guild?.channels || []).filter(
    (c) => c.type === 0 || c.type === 5,
  );
  const d = draft.draft;
  const presenceCode =
    guild?.code || (guild && guild.inGuild === false ? 'BOT_NOT_IN_GUILD' : null);
  const bannerTitle =
    presenceCode === 'NO_GUILD_CONFIGURED'
      ? L.noGuildConfiguredTitle
      : L.botNotInGuildTitle;
  const bannerBody =
    presenceCode === 'NO_GUILD_CONFIGURED'
      ? L.noGuildConfiguredBody
      : L.botNotInGuildBody;

  return (
    <main className="dashboard-page settings-page space-y-6">
      <header className="settings-page-header">
        <div>
          <p className="settings-page-eyebrow">{L.badge}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {L.settingsTitle}
          </h1>
          <p className="mt-1 max-w-[48ch] text-sm text-muted-foreground">
            {L.settingsSubtitle}
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

      {presenceCode && presenceCode !== 'OK' ? (
        <GuildPresenceBanner
          code={presenceCode}
          inviteUrl={guild?.inviteUrl}
          guildId={guild?.guildId || data.guildId}
          title={bannerTitle}
          body={bannerBody}
          inviteLabel={L.inviteBot}
          guildLabel={L.guild}
        />
      ) : null}

      <SectionCard title={L.generalTitle} icon={Settings2}>
        <p className="mb-4 text-sm text-muted-foreground">{L.generalBody}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={L.defaultChannel}
            value={d.defaultChannelId}
            onChange={(v) =>
              draft.setDraft({ ...d, defaultChannelId: v })
            }
            hint={
              textChannels.length === 0 ? L.channelImportHint : L.defaultHint
            }
            options={[
              { value: '', label: L.selectChannel },
              ...textChannels.map((c) => ({
                value: c.id,
                label: `#${c.name}`,
              })),
            ]}
          />
          <SelectField
            label={L.defaultColor}
            value={d.defaultColor}
            onChange={(v) => draft.setDraft({ ...d, defaultColor: v })}
            options={COLOR_OPTIONS.map((c) => ({ value: c, label: c }))}
          />
        </div>
      </SectionCard>

      <SectionCard title={L.profileTitle} icon={Settings2}>
        <p className="mb-4 text-sm text-muted-foreground">{L.profileBody}</p>
        <BotDiscordProfileEditor botId={botId} />
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
