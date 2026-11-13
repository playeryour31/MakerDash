'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Hash, MessageSquareText, Mic, Shield, Users } from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
  SelectField,
} from '@/components/apply/BotFormBits';
import GuildPresenceBanner from '@/components/GuildPresenceBanner';
import UnsavedChangesBar from '@/components/UnsavedChangesBar';
import UiSwitch from '@/components/UiSwitch';
import { useToast } from '@/hooks/useToast';
import { useUnsavedDraft } from '@/hooks/useUnsavedDraft';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { getDictionary } from '@/lib/i18n/dictionaries';

export type LogsFeatureId =
  | 'members'
  | 'messages'
  | 'voice'
  | 'roles'
  | 'channels';

type LogEventState = {
  id: string;
  enabled: boolean;
  channelId: string | null;
  color: string;
  runtimeReady: boolean;
};

type FeatureResponse = {
  feature: string;
  general?: { defaultChannelId: string | null; defaultColor: string };
  events: LogEventState[];
};

type GuildOptions = {
  guildId?: string;
  inGuild?: boolean;
  code?: string;
  inviteUrl?: string | null;
  channels: Array<{ id: string; name: string; type: number }>;
};

type EventDraft = {
  id: string;
  enabled: boolean;
  channelId: string;
  color: string;
  runtimeReady: boolean;
};

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

const ICONS: Record<LogsFeatureId, typeof Users> = {
  members: Users,
  messages: MessageSquareText,
  voice: Mic,
  roles: Shield,
  channels: Hash,
};

const TITLE_KEYS: Record<LogsFeatureId, string> = {
  members: 'members',
  messages: 'messages',
  voice: 'voice',
  roles: 'roles',
  channels: 'channels',
};

const BODY_KEYS: Record<LogsFeatureId, string> = {
  members: 'membersBody',
  messages: 'messagesBody',
  voice: 'voiceBody',
  roles: 'rolesBody',
  channels: 'channelsBody',
};

function eventLabelKey(id: string): string {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export default function LogsFeatureClient({
  feature,
}: {
  feature: LogsFeatureId;
}) {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t, locale } = useI18n();
  const L = (t.logs ?? getDictionary(locale).logs) as Record<string, string>;
  const Icon = ICONS[feature];
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guild, setGuild] = useState<GuildOptions | null>(null);
  const draft = useUnsavedDraft<EventDraft[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<FeatureResponse>(`/logs/${botId}/features/${feature}`),
      api<GuildOptions>(`/apply/${botId}/guild-options`).catch(() => null),
    ])
      .then(([res, guildOpts]) => {
        if (cancelled) return;
        draft.hydrate(
          (res.events || []).map((ev) => ({
            id: ev.id,
            enabled: ev.enabled,
            channelId: ev.channelId || '',
            color: ev.color || 'Green',
            runtimeReady: ev.runtimeReady !== false,
          })),
        );
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
  }, [botId, feature]);

  const textChannels = useMemo(
    () =>
      (guild?.channels || []).filter((c) => c.type === 0 || c.type === 5),
    [guild],
  );
  const canImport = guild?.inGuild === true && textChannels.length > 0;
  const presenceCode = guild?.code || (guild && !guild.inGuild ? 'BOT_NOT_IN_GUILD' : null);

  async function save() {
    setSaving(true);
    try {
      const res = await api<FeatureResponse>(
        `/logs/${botId}/features/${feature}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            events: draft.draft.map((ev) => ({
              id: ev.id,
              enabled: ev.enabled,
              channelId: ev.channelId || null,
              color: ev.color || 'Green',
            })),
          }),
        },
      );
      draft.commit(
        (res.events || []).map((ev) => ({
          id: ev.id,
          enabled: ev.enabled,
          channelId: ev.channelId || '',
          color: ev.color || 'Green',
          runtimeReady: ev.runtimeReady !== false,
        })),
      );
      toast.success(L.saved);
    } catch {
      toast.error(t.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  function updateEvent(id: string, patch: Partial<EventDraft>) {
    draft.setDraft(
      draft.draft.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)),
    );
  }

  if (loading && draft.draft.length === 0) return <BotPageSkeleton />;
  if (loadError) {
    return (
      <BotLoadError
        message={t.errors.loadBot}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const bannerTitle =
    presenceCode === 'NO_GUILD_CONFIGURED'
      ? L.noGuildConfiguredTitle
      : L.botNotInGuildTitle;
  const bannerBody =
    presenceCode === 'NO_GUILD_CONFIGURED'
      ? L.noGuildConfiguredBody
      : L.botNotInGuildBody;

  return (
    <main className="dashboard-page space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {L.badge}
        </p>
        <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          <Icon size={22} className="opacity-80" />
          {L[TITLE_KEYS[feature]]}
        </h1>
        <p className="mt-1 max-w-[52ch] text-sm text-muted-foreground">
          {L[BODY_KEYS[feature]]}
        </p>
      </header>

      {presenceCode && presenceCode !== 'OK' ? (
        <GuildPresenceBanner
          code={presenceCode}
          inviteUrl={guild?.inviteUrl}
          guildId={guild?.guildId}
          title={bannerTitle}
          body={bannerBody}
          inviteLabel={L.inviteBot}
          guildLabel={L.guild}
        />
      ) : null}

      <SectionCard title={L.eventsTitle} icon={Icon}>
        <p className="mb-4 text-sm text-muted-foreground">{L.eventsSubtitle}</p>
        <ul className="divide-y divide-border">
          {draft.draft.map((ev) => {
            const label =
              L[eventLabelKey(ev.id)] ||
              L[ev.id] ||
              ev.id.replace(/-/g, ' ');
            return (
              <li key={ev.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{label}</p>
                      {!ev.runtimeReady ? (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          {L.comingSoon}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {L[`${eventLabelKey(ev.id)}Desc`] || L.eventHint}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {ev.enabled ? L.enabled : L.disabled}
                    </span>
                    <UiSwitch
                      checked={ev.enabled}
                      onCheckedChange={(next) =>
                        updateEvent(ev.id, { enabled: next })
                      }
                      showLabel={false}
                      aria-label={label}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SelectField
                    label={L.logChannel}
                    value={ev.channelId}
                    onChange={(v) => updateEvent(ev.id, { channelId: v })}
                    hint={
                      !canImport && ev.enabled
                        ? L.channelImportHint
                        : undefined
                    }
                    options={[
                      { value: '', label: L.useDefault },
                      ...textChannels.map((c) => ({
                        value: c.id,
                        label: `#${c.name}`,
                      })),
                    ]}
                  />
                  <SelectField
                    label={L.embedColor}
                    value={ev.color}
                    onChange={(v) => updateEvent(ev.id, { color: v })}
                    options={COLOR_OPTIONS.map((c) => ({
                      value: c,
                      label: c,
                    }))}
                  />
                </div>
              </li>
            );
          })}
        </ul>
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
