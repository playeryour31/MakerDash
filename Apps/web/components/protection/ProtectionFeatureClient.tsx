'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Bomb,
  Bot,
  DoorOpen,
  Link2,
  Lock,
  MessageSquareWarning,
  Plus,
  ShieldAlert,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
  SelectField,
} from '@/components/apply/BotFormBits';
import FeatureEnableCard from '@/components/FeatureEnableCard';
import UnsavedChangesBar from '@/components/UnsavedChangesBar';
import { useToast } from '@/hooks/useToast';
import { useUnsavedDraft } from '@/hooks/useUnsavedDraft';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import {
  ProtectionHint,
  ProtectionTip,
  ProtectionWhy,
} from '@/components/protection/ProtectionHelp';
import ProtectionToggleRow from '@/components/protection/ProtectionToggleRow';

export type ProtectionFeatureId =
  | 'anti-nuke'
  | 'anti-bots'
  | 'whitelist'
  | 'anti-raid'
  | 'anti-spam'
  | 'anti-links'
  | 'join-gate'
  | 'lockdown';

const NUKE_ACTIONS = [
  'ban',
  'kick',
  'delete_roles',
  'create_roles',
  'delete_channel',
  'create_channel',
  'add_bots',
] as const;

type WhitelistEntry = { userId: string; actions: string[] };

type FeatureDraft = {
  enabled: boolean;
  mode: 'on' | 'off';
  limits: Record<string, number>;
  autoModes: Record<string, string>;
  windowMinutes: number;
  entries: WhitelistEntry[];
  joinThreshold: number;
  windowSeconds: number;
  alsoLockdown: boolean;
  maxMessages: number;
  maxMentions: number;
  blockEveryone: boolean;
  timeoutSeconds: number;
  blockInvites: boolean;
  blockLinks: boolean;
  blockWebhooks: boolean;
  allowedDomainsText: string;
  exemptRoleIds: string[];
  exemptChannelIds: string[];
  minAccountAgeDays: number;
  quarantineRoleId: string;
  active: boolean;
  muteEveryone: boolean;
  blockJoins: boolean;
  reason: string;
  punishment: string;
};

type GuildOptions = {
  channels: Array<{ id: string; name: string; type: number }>;
  roles: Array<{ id: string; name: string }>;
};

const EMPTY_LIMITS = Object.fromEntries(
  NUKE_ACTIONS.map((a) => [a, 5]),
) as Record<string, number>;
const EMPTY_MODES = Object.fromEntries(
  NUKE_ACTIONS.map((a) => [a, 'strip_roles']),
) as Record<string, string>;

const EMPTY: FeatureDraft = {
  enabled: false,
  mode: 'off',
  limits: { ...EMPTY_LIMITS },
  autoModes: { ...EMPTY_MODES },
  windowMinutes: 20,
  entries: [],
  joinThreshold: 8,
  windowSeconds: 12,
  alsoLockdown: false,
  maxMessages: 6,
  maxMentions: 5,
  blockEveryone: true,
  timeoutSeconds: 300,
  blockInvites: true,
  blockLinks: true,
  blockWebhooks: true,
  allowedDomainsText: '',
  exemptRoleIds: [],
  exemptChannelIds: [],
  minAccountAgeDays: 3,
  quarantineRoleId: '',
  active: false,
  muteEveryone: true,
  blockJoins: false,
  reason: '',
  punishment: 'kick',
};

const FEATURE_ICON: Record<ProtectionFeatureId, typeof Bomb> = {
  'anti-nuke': Bomb,
  'anti-bots': Bot,
  whitelist: UserCheck,
  'anti-raid': ShieldAlert,
  'anti-spam': MessageSquareWarning,
  'anti-links': Link2,
  'join-gate': DoorOpen,
  lockdown: Lock,
};

const TITLE_KEY: Record<ProtectionFeatureId, string> = {
  'anti-nuke': 'antiNuke',
  'anti-bots': 'antiBots',
  whitelist: 'whitelist',
  'anti-raid': 'antiRaid',
  'anti-spam': 'antiSpam',
  'anti-links': 'antiLinks',
  'join-gate': 'joinGate',
  lockdown: 'lockdown',
};

const WHY_KEY: Record<ProtectionFeatureId, string> = {
  'anti-nuke': 'antiNukeWhy',
  'anti-bots': 'antiBotsWhy',
  whitelist: 'whitelistWhy',
  'anti-raid': 'antiRaidWhy',
  'anti-spam': 'antiSpamWhy',
  'anti-links': 'antiLinksWhy',
  'join-gate': 'joinGateWhy',
  lockdown: 'lockdownWhy',
};

const TIP_KEY: Record<ProtectionFeatureId, string> = {
  'anti-nuke': 'antiNukeTip',
  'anti-bots': 'antiBotsTip',
  whitelist: 'whitelistTip',
  'anti-raid': 'antiRaidTip',
  'anti-spam': 'antiSpamTip',
  'anti-links': 'antiLinksTip',
  'join-gate': 'joinGateTip',
  lockdown: 'lockdownTip',
};

const BODY_KEY: Record<ProtectionFeatureId, string> = {
  'anti-nuke': 'antiNukeBody',
  'anti-bots': 'antiBotsBody',
  whitelist: 'whitelistBody',
  'anti-raid': 'antiRaidBody',
  'anti-spam': 'antiSpamBody',
  'anti-links': 'antiLinksBody',
  'join-gate': 'joinGateBody',
  lockdown: 'lockdownBody',
};

const ACTION_LABEL: Record<string, string> = {
  ban: 'actionBan',
  kick: 'actionKick',
  delete_roles: 'actionDeleteRoles',
  create_roles: 'actionCreateRoles',
  delete_channel: 'actionDeleteChannel',
  create_channel: 'actionCreateChannel',
  add_bots: 'actionAddBots',
};

function settingsToDraft(
  feature: ProtectionFeatureId,
  settings: Record<string, any>,
): FeatureDraft {
  const base = { ...EMPTY };
  base.enabled = Boolean(settings.enabled);
  base.mode = settings.mode === 'on' || settings.enabled ? 'on' : 'off';
  if (feature === 'anti-bots') {
    base.enabled = base.mode === 'on';
  }
  if (settings.limits && typeof settings.limits === 'object') {
    base.limits = { ...EMPTY_LIMITS, ...settings.limits };
  }
  if (settings.autoModes && typeof settings.autoModes === 'object') {
    base.autoModes = { ...EMPTY_MODES, ...settings.autoModes };
  }
  base.windowMinutes = Number(settings.windowMinutes ?? 20);
  base.entries = Array.isArray(settings.entries)
    ? settings.entries.map((e: any) => ({
        userId: String(e.userId || ''),
        actions: Array.isArray(e.actions) ? e.actions.map(String) : ['all'],
      }))
    : [];
  base.joinThreshold = Number(settings.joinThreshold ?? 8);
  base.windowSeconds = Number(settings.windowSeconds ?? 12);
  base.alsoLockdown = Boolean(settings.alsoLockdown);
  base.maxMessages = Number(settings.maxMessages ?? 6);
  base.maxMentions = Number(settings.maxMentions ?? 5);
  base.blockEveryone = settings.blockEveryone !== false;
  base.timeoutSeconds = Number(settings.timeoutSeconds ?? 300);
  base.blockInvites = settings.blockInvites !== false;
  base.blockLinks = settings.blockLinks !== false;
  base.blockWebhooks = settings.blockWebhooks !== false;
  base.allowedDomainsText = Array.isArray(settings.allowedDomains)
    ? settings.allowedDomains.join('\n')
    : '';
  base.exemptRoleIds = Array.isArray(settings.exemptRoleIds)
    ? settings.exemptRoleIds.map(String)
    : [];
  base.exemptChannelIds = Array.isArray(settings.exemptChannelIds)
    ? settings.exemptChannelIds.map(String)
    : [];
  base.minAccountAgeDays = Number(settings.minAccountAgeDays ?? 3);
  base.quarantineRoleId = String(settings.quarantineRoleId || '');
  base.active = Boolean(settings.active);
  base.muteEveryone = settings.muteEveryone !== false;
  base.blockJoins = Boolean(settings.blockJoins);
  base.reason = String(settings.reason || '');
  base.punishment = String(settings.punishment || 'kick');
  if (feature === 'lockdown') {
    base.enabled = Boolean(settings.enabled || settings.active);
  }
  return base;
}

function draftToPatch(
  feature: ProtectionFeatureId,
  d: FeatureDraft,
): Record<string, unknown> {
  switch (feature) {
    case 'anti-nuke':
      return {
        enabled: d.enabled,
        limits: d.limits,
        autoModes: d.autoModes,
        windowMinutes: d.windowMinutes,
      };
    case 'anti-bots':
      return { enabled: d.enabled, mode: d.enabled ? 'on' : 'off' };
    case 'whitelist':
      return { entries: d.entries };
    case 'anti-raid':
      return {
        enabled: d.enabled,
        joinThreshold: d.joinThreshold,
        windowSeconds: d.windowSeconds,
        punishment: d.punishment,
        alsoLockdown: d.alsoLockdown,
      };
    case 'anti-spam':
      return {
        enabled: d.enabled,
        maxMessages: d.maxMessages,
        windowSeconds: d.windowSeconds,
        maxMentions: d.maxMentions,
        blockEveryone: d.blockEveryone,
        punishment: d.punishment,
        timeoutSeconds: d.timeoutSeconds,
      };
    case 'anti-links':
      return {
        enabled: d.enabled,
        blockInvites: d.blockInvites,
        blockLinks: d.blockLinks,
        blockWebhooks: d.blockWebhooks,
        allowedDomains: d.allowedDomainsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        exemptRoleIds: d.exemptRoleIds,
        exemptChannelIds: d.exemptChannelIds,
        punishment: d.punishment,
      };
    case 'join-gate':
      return {
        enabled: d.enabled,
        minAccountAgeDays: d.minAccountAgeDays,
        punishment: d.punishment,
        quarantineRoleId: d.quarantineRoleId,
      };
    case 'lockdown':
      return {
        enabled: d.enabled,
        active: d.active,
        muteEveryone: d.muteEveryone,
        blockJoins: d.blockJoins,
        reason: d.reason,
      };
  }
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
      {hint ? <ProtectionHint>{hint}</ProtectionHint> : null}
    </label>
  );
}

export default function ProtectionFeatureClient({
  feature,
  embedded = false,
}: {
  feature: ProtectionFeatureId;
  embedded?: boolean;
}) {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const p = t.protection;
  const draft = useUnsavedDraft<FeatureDraft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guildOpts, setGuildOpts] = useState<GuildOptions | null>(null);

  const Icon = FEATURE_ICON[feature];
  const title = (p as any)[TITLE_KEY[feature]] || feature;
  const subtitle = (p as any)[BODY_KEY[feature]] || '';
  const why = (p as any)[WHY_KEY[feature]] || '';
  const tip = (p as any)[TIP_KEY[feature]] || '';

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api<{ settings: Record<string, any> }>(
        `/protection/${botId}/features/${feature}`,
      );
      draft.hydrate(settingsToDraft(feature, res.settings || {}));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId, feature]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    api<GuildOptions>(`/apply/${botId}/guild-options`)
      .then((opts) => {
        if (!cancelled) setGuildOpts(opts);
      })
      .catch(() => {
        if (!cancelled) setGuildOpts({ channels: [], roles: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [botId]);

  const roles = guildOpts?.roles || [];
  const d = draft.draft;

  async function save() {
    setSaving(true);
    try {
      const res = await api<{ settings: Record<string, any> }>(
        `/protection/${botId}/features/${feature}`,
        {
          method: 'PATCH',
          body: JSON.stringify(draftToPatch(feature, d)),
        },
      );
      draft.hydrate(settingsToDraft(feature, res.settings || {}));
      toast.success(p.saved);
    } catch {
      toast.error(t.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  const punishOptions = [
    { value: 'delete', label: p.punishDelete },
    { value: 'timeout', label: p.punishTimeout },
    { value: 'kick', label: p.punishKick },
    { value: 'ban', label: p.punishBan },
    { value: 'strip_roles', label: p.punishStrip },
    { value: 'quarantine', label: p.punishQuarantine },
    { value: 'lockdown', label: p.punishLockdown },
  ];

  const nukePunishOptions = [
    { value: 'ban', label: p.punishBan },
    { value: 'kick', label: p.punishKick },
    { value: 'strip_roles', label: p.punishStrip },
  ];

  if (loading) return <BotPageSkeleton />;
  if (loadError) {
    return (
      <BotLoadError
        message={t.errors.loadBot}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <main className={embedded ? 'space-y-5' : 'dashboard-page space-y-6'}>
      {!embedded ? (
        <header>
          <p className="settings-page-eyebrow">{p.badge}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 max-w-[52ch] text-sm text-muted-foreground">
            {subtitle}
          </p>
        </header>
      ) : null}

      {why ? <ProtectionWhy title={p.whyTitle} body={why} icon={Icon} /> : null}
      {tip ? <ProtectionTip title={p.tipTitle} body={tip} /> : null}

      {feature !== 'whitelist' ? (
        <FeatureEnableCard
          icon={Icon}
          title={p.toggleTitle}
          description={subtitle}
          enabled={feature === 'lockdown' ? d.active || d.enabled : d.enabled}
          enabledLabel={p.enabled}
          disabledLabel={p.disabled}
          onEnabledChange={(next) => {
            if (feature === 'lockdown') {
              draft.setDraft({ ...d, enabled: next, active: next });
            } else {
              draft.setDraft({
                ...d,
                enabled: next,
                mode: next ? 'on' : 'off',
              });
            }
          }}
        />
      ) : null}

      {feature === 'anti-nuke' ? (
        <>
          <SectionCard title={p.limitsTitle} icon={Bomb}>
            <div className="mb-4">
              <NumberField
                label={p.windowMinutes}
                value={d.windowMinutes}
                min={1}
                max={120}
                hint={p.antiNukeWindowHint}
                onChange={(n) => draft.setDraft({ ...d, windowMinutes: n })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {NUKE_ACTIONS.map((action) => (
                <NumberField
                  key={action}
                  label={(p as any)[ACTION_LABEL[action]] || action}
                  value={d.limits[action] ?? 5}
                  min={1}
                  max={100}
                  hint={p.antiNukeLimitHint}
                  onChange={(n) =>
                    draft.setDraft({
                      ...d,
                      limits: { ...d.limits, [action]: n },
                    })
                  }
                />
              ))}
            </div>
          </SectionCard>
          <SectionCard title={p.autoModeTitle} icon={ShieldAlert}>
            <p className="mb-3 text-xs text-muted-foreground">
              {p.antiNukePunishHint}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {NUKE_ACTIONS.map((action) => (
                <SelectField
                  key={action}
                  label={(p as any)[ACTION_LABEL[action]] || action}
                  value={d.autoModes[action] || 'strip_roles'}
                  onChange={(v) =>
                    draft.setDraft({
                      ...d,
                      autoModes: { ...d.autoModes, [action]: v },
                    })
                  }
                  options={nukePunishOptions}
                />
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}

      {feature === 'anti-raid' ? (
        <SectionCard title={title} icon={ShieldAlert}>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label={p.joinThreshold}
              value={d.joinThreshold}
              min={2}
              max={50}
              hint={p.antiRaidThresholdHint}
              onChange={(n) => draft.setDraft({ ...d, joinThreshold: n })}
            />
            <NumberField
              label={p.windowSeconds}
              value={d.windowSeconds}
              min={3}
              max={120}
              onChange={(n) => draft.setDraft({ ...d, windowSeconds: n })}
            />
            <SelectField
              label={p.punishment}
              value={d.punishment}
              onChange={(v) => draft.setDraft({ ...d, punishment: v })}
              options={punishOptions.filter((o) =>
                ['kick', 'ban', 'quarantine', 'lockdown'].includes(o.value),
              )}
            />
            <div className="sm:col-span-2">
              <ProtectionToggleRow
                label={p.alsoLockdown}
                checked={d.alsoLockdown}
                onCheckedChange={(alsoLockdown) =>
                  draft.setDraft({ ...d, alsoLockdown })
                }
              />
            </div>
          </div>
        </SectionCard>
      ) : null}

      {feature === 'anti-spam' ? (
        <SectionCard title={title} icon={MessageSquareWarning}>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label={p.maxMessages}
              value={d.maxMessages}
              min={2}
              max={30}
              onChange={(n) => draft.setDraft({ ...d, maxMessages: n })}
            />
            <NumberField
              label={p.windowSeconds}
              value={d.windowSeconds}
              min={2}
              max={60}
              onChange={(n) => draft.setDraft({ ...d, windowSeconds: n })}
            />
            <NumberField
              label={p.maxMentions}
              value={d.maxMentions}
              min={1}
              max={30}
              onChange={(n) => draft.setDraft({ ...d, maxMentions: n })}
            />
            <NumberField
              label={p.timeoutSeconds}
              value={d.timeoutSeconds}
              min={10}
              max={2419200}
              onChange={(n) => draft.setDraft({ ...d, timeoutSeconds: n })}
            />
            <SelectField
              label={p.punishment}
              value={d.punishment}
              onChange={(v) => draft.setDraft({ ...d, punishment: v })}
              options={punishOptions.filter((o) =>
                ['delete', 'timeout', 'kick', 'ban'].includes(o.value),
              )}
            />
            <div className="sm:col-span-2">
              <ProtectionToggleRow
                label={p.blockEveryone}
                checked={d.blockEveryone}
                onCheckedChange={(blockEveryone) =>
                  draft.setDraft({ ...d, blockEveryone })
                }
              />
            </div>
          </div>
        </SectionCard>
      ) : null}

      {feature === 'anti-links' ? (
        <SectionCard title={title} icon={Link2}>
          <div className="space-y-4">
            <div className="divide-y divide-border/60">
              {(
                [
                  ['blockInvites', 'blockInvites'],
                  ['blockLinks', 'blockLinks'],
                  ['blockWebhooks', 'blockWebhooks'],
                ] as const
              ).map(([key, labelKey]) => (
                <ProtectionToggleRow
                  key={key}
                  label={(p as any)[labelKey]}
                  checked={Boolean((d as any)[key])}
                  onCheckedChange={(next) =>
                    draft.setDraft({ ...d, [key]: next })
                  }
                />
              ))}
            </div>
            <label className="block text-sm">
              <span className="text-muted-foreground">{p.allowedDomains}</span>
              <textarea
                value={d.allowedDomainsText}
                onChange={(e) =>
                  draft.setDraft({ ...d, allowedDomainsText: e.target.value })
                }
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
            </label>
            <SelectField
              label={p.punishment}
              value={d.punishment}
              onChange={(v) => draft.setDraft({ ...d, punishment: v })}
              options={punishOptions.filter((o) =>
                ['delete', 'timeout', 'kick', 'ban'].includes(o.value),
              )}
            />
          </div>
        </SectionCard>
      ) : null}

      {feature === 'join-gate' ? (
        <SectionCard title={title} icon={DoorOpen}>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label={p.minAccountAge}
              value={d.minAccountAgeDays}
              min={0}
              max={365}
              onChange={(n) => draft.setDraft({ ...d, minAccountAgeDays: n })}
            />
            <SelectField
              label={p.punishment}
              value={d.punishment}
              onChange={(v) => draft.setDraft({ ...d, punishment: v })}
              options={punishOptions.filter((o) =>
                ['kick', 'ban', 'quarantine'].includes(o.value),
              )}
            />
            <SelectField
              label={p.quarantineRole}
              value={d.quarantineRoleId}
              onChange={(v) => draft.setDraft({ ...d, quarantineRoleId: v })}
              options={[
                { value: '', label: p.selectChannel },
                ...roles.map((r) => ({ value: r.id, label: r.name })),
              ]}
            />
          </div>
        </SectionCard>
      ) : null}

      {feature === 'lockdown' ? (
        <SectionCard title={title} icon={Lock}>
          <div className="space-y-1 divide-y divide-border/60">
            <ProtectionToggleRow
              label={p.lockdownActive}
              checked={d.active}
              onCheckedChange={(active) =>
                draft.setDraft({
                  ...d,
                  active,
                  enabled: active || d.enabled,
                })
              }
            />
            <ProtectionToggleRow
              label={p.muteEveryone}
              checked={d.muteEveryone}
              onCheckedChange={(muteEveryone) =>
                draft.setDraft({ ...d, muteEveryone })
              }
            />
            <ProtectionToggleRow
              label={p.blockJoins}
              checked={d.blockJoins}
              onCheckedChange={(blockJoins) =>
                draft.setDraft({ ...d, blockJoins })
              }
            />
            <label className="block pt-3 text-sm">
              <span className="text-muted-foreground">{p.lockdownReason}</span>
              <input
                value={d.reason}
                onChange={(e) =>
                  draft.setDraft({ ...d, reason: e.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>
        </SectionCard>
      ) : null}

      {feature === 'whitelist' ? (
        <SectionCard title={title} icon={UserCheck}>
          <div className="space-y-3">
            {d.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{p.noWhitelist}</p>
            ) : null}
            {d.entries.map((entry, i) => (
              <div
                key={`${entry.userId}-${i}`}
                className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3 sm:flex-row sm:items-center"
              >
                <input
                  value={entry.userId}
                  onChange={(e) => {
                    const entries = [...d.entries];
                    entries[i] = { ...entry, userId: e.target.value };
                    draft.setDraft({ ...d, entries });
                  }}
                  placeholder={p.userIdPlaceholder}
                  className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-sm"
                  dir="ltr"
                />
                <SelectField
                  label=""
                  value={entry.actions?.[0] || 'all'}
                  onChange={(v) => {
                    const entries = [...d.entries];
                    entries[i] = { ...entry, actions: [v] };
                    draft.setDraft({ ...d, entries });
                  }}
                  options={[
                    { value: 'all', label: p.actionAll },
                    ...NUKE_ACTIONS.map((a) => ({
                      value: a,
                      label: (p as any)[ACTION_LABEL[a]] || a,
                    })),
                  ]}
                />
                <button
                  type="button"
                  onClick={() => {
                    const entries = d.entries.filter((_, idx) => idx !== i);
                    draft.setDraft({ ...d, entries });
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
                >
                  <Trash2 size={14} />
                  {p.remove}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                draft.setDraft({
                  ...d,
                  entries: [...d.entries, { userId: '', actions: ['all'] }],
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-muted/40"
            >
              <Plus size={15} />
              {p.addUser}
            </button>
          </div>
        </SectionCard>
      ) : null}

      <UnsavedChangesBar
        open={draft.isDirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => draft.discard()}
      />
    </main>
  );
}
