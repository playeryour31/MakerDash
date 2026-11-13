'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Trash2, MessageSquareText, UserPlus, Trophy, SmilePlus, HandMetal } from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
  SelectField,
} from '@/components/apply/BotFormBits';
import UnsavedChangesBar from '@/components/UnsavedChangesBar';
import FeatureEnableCard from '@/components/FeatureEnableCard';
import AutoRolePicker from '@/components/system/AutoRolePicker';
import { useToast } from '@/hooks/useToast';
import { useUnsavedDraft } from '@/hooks/useUnsavedDraft';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';

export type SystemFeatureId =
  | 'auto-responder'
  | 'auto-roles'
  | 'welcome'
  | 'leveling'
  | 'reaction-roles';

const FEATURE_ICON: Record<
  SystemFeatureId,
  typeof MessageSquareText
> = {
  'auto-responder': MessageSquareText,
  'auto-roles': UserPlus,
  welcome: HandMetal,
  leveling: Trophy,
  'reaction-roles': SmilePlus,
};

type GuildOptions = {
  channels: Array<{ id: string; name: string; type: number }>;
  roles: Array<{ id: string; name: string; color?: number; managed?: boolean }>;
};

type ReplyRow = {
  trigger: string;
  response: string;
  match: 'exact' | 'contains';
};

type ReactionPanel = {
  channelId: string;
  messageId: string;
  mappings: Array<{ emoji: string; roleId: string }>;
};

type FeatureDraft = {
  enabled: boolean;
  // auto-responder
  replies: ReplyRow[];
  // auto-roles
  roleIds: string[];
  // welcome (unused — dedicated WelcomeClient)
  channelId: string;
  message: string;
  type: 'embed' | 'message' | 'image';
  caption: boolean;
  hasBackground: boolean;
  backgroundUrl: string | null;
  avatar: Record<string, unknown>;
  text: Record<string, unknown>;
  // leveling
  xpPerMessage: number;
  cooldownSeconds: number;
  // reaction-roles
  panels: ReactionPanel[];
};

const EMPTY: FeatureDraft = {
  enabled: false,
  replies: [],
  roleIds: [],
  channelId: '',
  message: '',
  type: 'embed',
  caption: true,
  hasBackground: false,
  backgroundUrl: null,
  avatar: {},
  text: {},
  xpPerMessage: 15,
  cooldownSeconds: 60,
  panels: [],
};

function settingsToDraft(settings: Record<string, any>): FeatureDraft {
  return {
    enabled: Boolean(settings.enabled),
    replies: Array.isArray(settings.replies) ? settings.replies : [],
    roleIds: Array.isArray(settings.roleIds) ? settings.roleIds.map(String) : [],
    channelId: String(settings.channelId || ''),
    message: String(settings.message || ''),
    type:
      settings.type === 'message' || settings.type === 'image'
        ? settings.type
        : 'embed',
    caption: settings.caption !== false,
    hasBackground: Boolean(settings.hasBackground),
    backgroundUrl: settings.backgroundUrl ? String(settings.backgroundUrl) : null,
    avatar:
      settings.avatar && typeof settings.avatar === 'object' ? settings.avatar : {},
    text: settings.text && typeof settings.text === 'object' ? settings.text : {},
    xpPerMessage: Number(settings.xpPerMessage ?? 15),
    cooldownSeconds: Number(settings.cooldownSeconds ?? 60),
    panels: Array.isArray(settings.panels) ? settings.panels : [],
  };
}

function draftToPatch(feature: SystemFeatureId, d: FeatureDraft): Record<string, unknown> {
  switch (feature) {
    case 'auto-responder':
      return { enabled: d.enabled, replies: d.replies };
    case 'auto-roles':
      return { enabled: d.enabled, roleIds: d.roleIds };
    case 'welcome':
      return {
        enabled: d.enabled,
        channelId: d.channelId,
        message: d.message,
        type: d.type,
        caption: d.caption,
        avatar: d.avatar,
        text: d.text,
      };
    case 'leveling':
      return {
        enabled: d.enabled,
        channelId: d.channelId,
        xpPerMessage: d.xpPerMessage,
        cooldownSeconds: d.cooldownSeconds,
      };
    case 'reaction-roles':
      return { enabled: d.enabled, panels: d.panels };
  }
}

const TITLE_KEY: Record<SystemFeatureId, string> = {
  'auto-responder': 'autoResponder',
  'auto-roles': 'autoRoles',
  welcome: 'welcome',
  leveling: 'leveling',
  'reaction-roles': 'reactionRoles',
};

const BODY_KEY: Record<SystemFeatureId, string> = {
  'auto-responder': 'autoResponderBody',
  'auto-roles': 'autoRolesBody',
  welcome: 'welcomeBody',
  leveling: 'levelingBody',
  'reaction-roles': 'reactionRolesBody',
};

export default function SystemFeatureClient({
  feature,
}: {
  feature: SystemFeatureId;
}) {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const s = t.system;
  const draft = useUnsavedDraft<FeatureDraft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guildOpts, setGuildOpts] = useState<GuildOptions | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const title = (s as any)[TITLE_KEY[feature]] || feature;
  const subtitle = (s as any)[BODY_KEY[feature]] || '';

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api<{ settings: Record<string, any> }>(
        `/system/${botId}/features/${feature}`,
      );
      draft.hydrate(settingsToDraft(res.settings || {}));
      setHydrated(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [botId, feature]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId, feature]);

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

  const textChannels = useMemo(
    () =>
      (guildOpts?.channels || []).filter(
        (c) => c.type === 0 || c.type === 5 || c.type === undefined,
      ),
    [guildOpts],
  );

  async function save() {
    setSaving(true);
    try {
      const res = await api<{ settings: Record<string, any> }>(
        `/system/${botId}/features/${feature}`,
        {
          method: 'PATCH',
          body: JSON.stringify(draftToPatch(feature, draft.draft)),
        },
      );
      draft.hydrate(settingsToDraft(res.settings || {}));
      toast.success(s.saved);
    } catch (err: any) {
      toast.error(err?.message || t.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !hydrated) return <BotPageSkeleton />;
  if (loadError) {
    return (
      <BotLoadError message={t.errors.loadBot} onRetry={() => void load()} />
    );
  }

  const d = draft.draft;

  return (
    <div className="dashboard-page space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t.nav.groupSystem}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{subtitle}</p>
      </header>

      <FeatureEnableCard
        icon={FEATURE_ICON[feature]}
        title={title}
        description={subtitle}
        enabled={d.enabled}
        enabledLabel={s.enabled}
        disabledLabel={s.disabled}
        switchAriaLabel={d.enabled ? s.enabled : s.disabled}
        onEnabledChange={(next) => draft.setDraft({ ...d, enabled: next })}
      />

      {feature === 'auto-responder' ? (
        <SectionCard
          title={s.repliesTitle}
          icon={MessageSquareText}
          disabled={!d.enabled}
        >
          <div className="space-y-3">
            {d.replies.map((row, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
              >
                <input
                  className="ui-input"
                  placeholder={s.triggerPlaceholder}
                  value={row.trigger}
                  onChange={(e) => {
                    const replies = [...d.replies];
                    replies[i] = { ...row, trigger: e.target.value };
                    draft.setDraft({ ...d, replies });
                  }}
                />
                <input
                  className="ui-input"
                  placeholder={s.responsePlaceholder}
                  value={row.response}
                  onChange={(e) => {
                    const replies = [...d.replies];
                    replies[i] = { ...row, response: e.target.value };
                    draft.setDraft({ ...d, replies });
                  }}
                />
                <select
                  className="ui-input"
                  value={row.match}
                  onChange={(e) => {
                    const replies = [...d.replies];
                    replies[i] = {
                      ...row,
                      match: e.target.value === 'exact' ? 'exact' : 'contains',
                    };
                    draft.setDraft({ ...d, replies });
                  }}
                >
                  <option value="contains">{s.matchContains}</option>
                  <option value="exact">{s.matchExact}</option>
                </select>
                <button
                  type="button"
                  className="ui-press inline-flex items-center justify-center rounded-lg border border-border p-2 text-destructive"
                  onClick={() =>
                    draft.setDraft({
                      ...d,
                      replies: d.replies.filter((_, idx) => idx !== i),
                    })
                  }
                  aria-label={s.remove}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="ui-press inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
              onClick={() =>
                draft.setDraft({
                  ...d,
                  replies: [
                    ...d.replies,
                    { trigger: '', response: '', match: 'contains' },
                  ],
                })
              }
            >
              <Plus size={15} />
              {s.addReply}
            </button>
          </div>
        </SectionCard>
      ) : null}

      {feature === 'auto-roles' ? (
        <SectionCard
          title={s.rolesTitle}
          icon={UserPlus}
          disabled={!d.enabled}
        >
          <p className="mb-3 text-sm text-muted-foreground">{s.autoRolesHint}</p>
          <AutoRolePicker
            roles={guildOpts?.roles || []}
            selectedIds={d.roleIds}
            onChange={(roleIds) => draft.setDraft({ ...d, roleIds })}
            labels={{
              search: s.searchRoles,
              addRole: s.addRole,
              emptySelected: s.noSelectedRoles,
              emptySearch: s.noRoleMatch,
              noRoles: s.noRoles,
              managedHint: s.managedRolesOnly,
              selectedCount: s.selectedRolesCount,
              remove: s.remove,
            }}
          />
        </SectionCard>
      ) : null}

      {feature === 'leveling' ? (
        <SectionCard
          title={s.levelingSettings}
          icon={Trophy}
          disabled={!d.enabled}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label={s.levelChannel}
              value={d.channelId}
              onChange={(v) => draft.setDraft({ ...d, channelId: v })}
              options={[
                { value: '', label: s.selectChannel },
                ...textChannels.map((c) => ({
                  value: c.id,
                  label: `#${c.name}`,
                })),
              ]}
            />
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted-foreground">
                {s.xpPerMessage}
              </span>
              <input
                type="number"
                min={1}
                max={500}
                className="ui-input"
                value={d.xpPerMessage}
                onChange={(e) =>
                  draft.setDraft({
                    ...d,
                    xpPerMessage: Number(e.target.value || 15),
                  })
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted-foreground">
                {s.cooldownSeconds}
              </span>
              <input
                type="number"
                min={0}
                max={3600}
                className="ui-input"
                value={d.cooldownSeconds}
                onChange={(e) =>
                  draft.setDraft({
                    ...d,
                    cooldownSeconds: Number(e.target.value || 0),
                  })
                }
              />
            </label>
          </div>
        </SectionCard>
      ) : null}

      {feature === 'reaction-roles' ? (
        <SectionCard
          title={s.reactionPanels}
          icon={SmilePlus}
          disabled={!d.enabled}
        >
          <div className="space-y-3">
            {d.panels.map((panel, i) => (
              <div
                key={i}
                className="space-y-2 rounded-xl border border-border bg-muted/20 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <SelectField
                    label={s.channel}
                    value={panel.channelId}
                    onChange={(v) => {
                      const panels = [...d.panels];
                      panels[i] = { ...panel, channelId: v };
                      draft.setDraft({ ...d, panels });
                    }}
                    options={[
                      { value: '', label: s.selectChannel },
                      ...textChannels.map((c) => ({
                        value: c.id,
                        label: `#${c.name}`,
                      })),
                    ]}
                  />
                  <label className="block text-sm">
                    <span className="mb-1.5 block text-muted-foreground">
                      {s.messageId}
                    </span>
                    <input
                      className="ui-input font-mono text-xs"
                      value={panel.messageId}
                      onChange={(e) => {
                        const panels = [...d.panels];
                        panels[i] = { ...panel, messageId: e.target.value };
                        draft.setDraft({ ...d, panels });
                      }}
                    />
                  </label>
                </div>
                {(panel.mappings || []).map((m, mi) => (
                  <div
                    key={mi}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      className="ui-input"
                      placeholder={s.emojiPlaceholder}
                      value={m.emoji}
                      onChange={(e) => {
                        const panels = [...d.panels];
                        const mappings = [...(panel.mappings || [])];
                        mappings[mi] = { ...m, emoji: e.target.value };
                        panels[i] = { ...panel, mappings };
                        draft.setDraft({ ...d, panels });
                      }}
                    />
                    <SelectField
                      label=""
                      value={m.roleId}
                      onChange={(v) => {
                        const panels = [...d.panels];
                        const mappings = [...(panel.mappings || [])];
                        mappings[mi] = { ...m, roleId: v };
                        panels[i] = { ...panel, mappings };
                        draft.setDraft({ ...d, panels });
                      }}
                      options={[
                        { value: '', label: s.selectRole },
                        ...(guildOpts?.roles || []).map((r) => ({
                          value: r.id,
                          label: r.name,
                        })),
                      ]}
                    />
                    <button
                      type="button"
                      className="ui-press rounded-lg border border-border p-2 text-destructive"
                      onClick={() => {
                        const panels = [...d.panels];
                        panels[i] = {
                          ...panel,
                          mappings: (panel.mappings || []).filter(
                            (_, idx) => idx !== mi,
                          ),
                        };
                        draft.setDraft({ ...d, panels });
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="ui-press inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold"
                    onClick={() => {
                      const panels = [...d.panels];
                      panels[i] = {
                        ...panel,
                        mappings: [
                          ...(panel.mappings || []),
                          { emoji: '', roleId: '' },
                        ],
                      };
                      draft.setDraft({ ...d, panels });
                    }}
                  >
                    <Plus size={13} />
                    {s.addMapping}
                  </button>
                  <button
                    type="button"
                    className="ui-press inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-destructive"
                    onClick={() =>
                      draft.setDraft({
                        ...d,
                        panels: d.panels.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    <Trash2 size={13} />
                    {s.removePanel}
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="ui-press inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
              onClick={() =>
                draft.setDraft({
                  ...d,
                  panels: [
                    ...d.panels,
                    { channelId: '', messageId: '', mappings: [] },
                  ],
                })
              }
            >
              <Plus size={15} />
              {s.addPanel}
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
    </div>
  );
}
