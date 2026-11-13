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
import UnsavedChangesBar from '@/components/UnsavedChangesBar';
import { useToast } from '@/hooks/useToast';
import { useUnsavedDraft } from '@/hooks/useUnsavedDraft';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import {
  ProtectionTip,
  ProtectionWhy,
} from '@/components/protection/ProtectionHelp';
import ProtectionToggleRow from '@/components/protection/ProtectionToggleRow';

export type ProtectionOverviewData = {
  botId: string;
  type: string;
  running: boolean;
  guildId: string | null;
};

type GuildOptions = {
  channels: Array<{ id: string; name: string; type: number }>;
};

type GeneralDraft = {
  logChannelId: string;
  notifyOwner: boolean;
};

const EMPTY: GeneralDraft = { logChannelId: '', notifyOwner: true };

const BotDiscordProfileEditor = dynamic(
  () => import('@/components/BotDiscordProfileEditor'),
  {
    loading: () => (
      <div className="h-52 animate-pulse rounded-2xl border border-border bg-card" />
    ),
    ssr: false,
  },
);

export default function ProtectionSettingsClient() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const p = t.protection;
  const [data, setData] = useState<ProtectionOverviewData | null>(null);
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
      api<ProtectionOverviewData>(`/protection/${botId}`),
      api<{ settings: GeneralDraft }>(`/protection/${botId}/features/general`),
      api<GuildOptions>(`/apply/${botId}/guild-options`).catch(() => null),
    ])
      .then(([overview, general, opts]) => {
        if (cancelled) return;
        setData(overview);
        setGuild(opts);
        draft.hydrate({
          logChannelId: String(general.settings?.logChannelId || ''),
          notifyOwner: general.settings?.notifyOwner !== false,
        });
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
      const res = await api<{ running: boolean }>(
        `/protection/${botId}/runtime`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );
      const running = !!res.running;
      setData((prev) => (prev ? { ...prev, running } : prev));
      await syncHomeBotRunning(botId, running);
      toast.success(
        action === 'restart'
          ? p.restarted
          : action === 'start'
            ? p.started
            : p.stopped,
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
      await api(`/protection/${botId}/features/general`, {
        method: 'PATCH',
        body: JSON.stringify(draft.draft),
      });
      draft.commit(draft.draft);
      toast.success(p.saved);
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

  return (
    <main className="dashboard-page settings-page space-y-6">
      <header className="settings-page-header">
        <div>
          <p className="settings-page-eyebrow">{p.badge}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {p.settingsTitle}
          </h1>
          <p className="mt-1 max-w-[48ch] text-sm text-muted-foreground">
            {p.settingsSubtitle}
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

      <ProtectionWhy title={p.whyTitle} body={p.generalWhy} icon={Settings2} />
      <ProtectionTip title={p.tipTitle} body={p.tipBotRole} />

      <SectionCard title={p.profileTitle} icon={Settings2}>
        <p className="mb-4 text-sm text-muted-foreground">{p.profileBody}</p>
        <BotDiscordProfileEditor botId={botId} />
      </SectionCard>

      <SectionCard title={p.generalTitle} icon={Settings2}>
        <p className="mb-4 text-sm text-muted-foreground">{p.generalBody}</p>
        <div className="space-y-4">
          <SelectField
            label={p.logChannel}
            value={d.logChannelId}
            onChange={(v) => draft.setDraft({ ...d, logChannelId: v })}
            hint={p.generalLogHint}
            options={[
              { value: '', label: p.selectChannel },
              ...textChannels.map((c) => ({
                value: c.id,
                label: `#${c.name}`,
              })),
            ]}
          />
          <ProtectionToggleRow
            label={p.notifyOwner}
            checked={d.notifyOwner}
            onCheckedChange={(notifyOwner) =>
              draft.setDraft({ ...d, notifyOwner })
            }
          />
        </div>
      </SectionCard>

      <div className="rounded-2xl border border-border bg-card/90 p-5">
        <p className="text-sm text-muted-foreground">{p.guild}</p>
        <code
          className="mt-2 block rounded-xl border border-border bg-muted/30 px-3 py-2 font-mono text-xs"
          dir="ltr"
        >
          {data.guildId || p.noGuild}
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
