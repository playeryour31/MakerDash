'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  KeyRound,
  RefreshCw,
  ServerCog,
  UserMinus,
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
  ProtectionTip,
  ProtectionWhy,
} from '@/components/protection/ProtectionHelp';
import ProtectionToggleRow from '@/components/protection/ProtectionToggleRow';

export type HardenFeatureId =
  | 'anti-perms'
  | 'recovery'
  | 'anti-prune'
  | 'anti-server';

type Draft = {
  enabled: boolean;
  punishGrantee: boolean;
  punishExecutor: boolean;
  punishment: string;
  trustedUserIdsText: string;
  blockAdministrator: boolean;
  blockManageGuild: boolean;
  blockManageRoles: boolean;
  blockManageChannels: boolean;
  blockBanMembers: boolean;
  blockKickMembers: boolean;
  blockMentionEveryone: boolean;
  autoRestore: boolean;
  snapshotIntervalMinutes: number;
  restoreChannelThreshold: number;
  windowSeconds: number;
  alsoLockdown: boolean;
  lastSnapshotAt: string | null;
  blockVanity: boolean;
  blockName: boolean;
  blockIcon: boolean;
  blockBanner: boolean;
  blockVerification: boolean;
};

const EMPTY: Draft = {
  enabled: false,
  punishGrantee: true,
  punishExecutor: true,
  punishment: 'strip_roles',
  trustedUserIdsText: '',
  blockAdministrator: true,
  blockManageGuild: true,
  blockManageRoles: false,
  blockManageChannels: false,
  blockBanMembers: false,
  blockKickMembers: false,
  blockMentionEveryone: true,
  autoRestore: true,
  snapshotIntervalMinutes: 10,
  restoreChannelThreshold: 3,
  windowSeconds: 45,
  alsoLockdown: true,
  lastSnapshotAt: null,
  blockVanity: true,
  blockName: false,
  blockIcon: false,
  blockBanner: false,
  blockVerification: true,
};

const META: Record<
  HardenFeatureId,
  {
    icon: typeof KeyRound;
    titleKey: string;
    bodyKey: string;
    whyKey: string;
    tipKey: string;
  }
> = {
  'anti-perms': {
    icon: KeyRound,
    titleKey: 'antiPerms',
    bodyKey: 'antiPermsBody',
    whyKey: 'antiPermsWhy',
    tipKey: 'antiPermsTip',
  },
  recovery: {
    icon: RefreshCw,
    titleKey: 'recovery',
    bodyKey: 'recoveryBody',
    whyKey: 'recoveryWhy',
    tipKey: 'recoveryTip',
  },
  'anti-prune': {
    icon: UserMinus,
    titleKey: 'antiPrune',
    bodyKey: 'antiPruneBody',
    whyKey: 'antiPruneWhy',
    tipKey: 'antiPruneTip',
  },
  'anti-server': {
    icon: ServerCog,
    titleKey: 'antiServer',
    bodyKey: 'antiServerBody',
    whyKey: 'antiServerWhy',
    tipKey: 'antiServerTip',
  },
};

function settingsToDraft(
  feature: HardenFeatureId,
  settings: Record<string, any>,
): Draft {
  const d = { ...EMPTY };
  d.enabled = Boolean(settings.enabled);
  d.punishGrantee = settings.punishGrantee !== false;
  d.punishExecutor = settings.punishExecutor !== false;
  d.punishment = String(settings.punishment || 'strip_roles');
  d.trustedUserIdsText = Array.isArray(settings.trustedUserIds)
    ? settings.trustedUserIds.join('\n')
    : '';
  d.blockAdministrator = settings.blockAdministrator !== false;
  d.blockManageGuild = settings.blockManageGuild !== false;
  d.blockManageRoles = Boolean(settings.blockManageRoles);
  d.blockManageChannels = Boolean(settings.blockManageChannels);
  d.blockBanMembers = Boolean(settings.blockBanMembers);
  d.blockKickMembers = Boolean(settings.blockKickMembers);
  d.blockMentionEveryone = settings.blockMentionEveryone !== false;
  d.autoRestore = settings.autoRestore !== false;
  d.snapshotIntervalMinutes = Number(settings.snapshotIntervalMinutes ?? 10);
  d.restoreChannelThreshold = Number(settings.restoreChannelThreshold ?? 3);
  d.windowSeconds = Number(settings.windowSeconds ?? 45);
  d.alsoLockdown = Boolean(settings.alsoLockdown);
  d.lastSnapshotAt = settings.lastSnapshotAt
    ? String(settings.lastSnapshotAt)
    : null;
  d.blockVanity = settings.blockVanity !== false;
  d.blockName = Boolean(settings.blockName);
  d.blockIcon = Boolean(settings.blockIcon);
  d.blockBanner = Boolean(settings.blockBanner);
  d.blockVerification = settings.blockVerification !== false;
  if (feature === 'anti-prune') {
    d.alsoLockdown = settings.alsoLockdown !== false;
  }
  return d;
}

function draftToPatch(feature: HardenFeatureId, d: Draft) {
  switch (feature) {
    case 'anti-perms':
      return {
        enabled: d.enabled,
        punishGrantee: d.punishGrantee,
        punishExecutor: d.punishExecutor,
        punishment: d.punishment,
        trustedUserIds: d.trustedUserIdsText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        blockAdministrator: d.blockAdministrator,
        blockManageGuild: d.blockManageGuild,
        blockManageRoles: d.blockManageRoles,
        blockManageChannels: d.blockManageChannels,
        blockBanMembers: d.blockBanMembers,
        blockKickMembers: d.blockKickMembers,
        blockMentionEveryone: d.blockMentionEveryone,
      };
    case 'recovery':
      return {
        enabled: d.enabled,
        autoRestore: d.autoRestore,
        snapshotIntervalMinutes: d.snapshotIntervalMinutes,
        restoreChannelThreshold: d.restoreChannelThreshold,
        windowSeconds: d.windowSeconds,
        alsoLockdown: d.alsoLockdown,
      };
    case 'anti-prune':
      return {
        enabled: d.enabled,
        punishment: d.punishment,
        alsoLockdown: d.alsoLockdown,
      };
    case 'anti-server':
      return {
        enabled: d.enabled,
        blockVanity: d.blockVanity,
        blockName: d.blockName,
        blockIcon: d.blockIcon,
        blockBanner: d.blockBanner,
        blockVerification: d.blockVerification,
        punishment: d.punishment,
        alsoLockdown: d.alsoLockdown,
      };
  }
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <ProtectionToggleRow
      label={label}
      checked={checked}
      onCheckedChange={onChange}
    />
  );
}

export default function ProtectionHardeningClient({
  feature,
  embedded = false,
}: {
  feature: HardenFeatureId;
  embedded?: boolean;
}) {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const p = t.protection as Record<string, any>;
  const draft = useUnsavedDraft<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const d = draft.draft;
  const meta = META[feature];
  const Icon = meta.icon;

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

  if (loading) return <BotPageSkeleton />;
  if (loadError) {
    return (
      <BotLoadError message={t.errors.loadBot} onRetry={() => void load()} />
    );
  }

  const punishOptions = [
    { value: 'strip_roles', label: p.punishStrip },
    { value: 'kick', label: p.punishKick },
    { value: 'ban', label: p.punishBan },
    { value: 'timeout', label: p.punishTimeout },
  ];

  return (
    <main
      className={
        embedded ? 'space-y-5 pb-8' : 'dashboard-page space-y-6 pb-24'
      }
    >
      {!embedded ? (
        <header>
          <p className="settings-page-eyebrow">{p.badge}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {p[meta.titleKey]}
          </h1>
          <p className="mt-1 max-w-[52ch] text-sm text-muted-foreground">
            {p[meta.bodyKey]}
          </p>
        </header>
      ) : null}

      <ProtectionWhy
        title={p.whyTitle}
        body={p[meta.whyKey]}
        icon={Icon}
      />
      <ProtectionTip title={p.tipTitle} body={p[meta.tipKey]} />

      <FeatureEnableCard
        icon={Icon}
        title={p.toggleTitle}
        description={p[meta.bodyKey]}
        enabled={d.enabled}
        enabledLabel={p.enabled}
        disabledLabel={p.disabled}
        onEnabledChange={(enabled) =>
          draft.setDraft((prev) => ({ ...prev, enabled }))
        }
      />

      {feature === 'anti-perms' ? (
        <>
          <SectionCard title={p.antiPermsWatch} icon={Icon}>
            <div className="space-y-2">
              <CheckRow
                label={p.permAdministrator}
                checked={d.blockAdministrator}
                onChange={(blockAdministrator) =>
                  draft.setDraft((prev) => ({ ...prev, blockAdministrator }))
                }
              />
              <CheckRow
                label={p.permManageGuild}
                checked={d.blockManageGuild}
                onChange={(blockManageGuild) =>
                  draft.setDraft((prev) => ({ ...prev, blockManageGuild }))
                }
              />
              <CheckRow
                label={p.permManageRoles}
                checked={d.blockManageRoles}
                onChange={(blockManageRoles) =>
                  draft.setDraft((prev) => ({ ...prev, blockManageRoles }))
                }
              />
              <CheckRow
                label={p.permManageChannels}
                checked={d.blockManageChannels}
                onChange={(blockManageChannels) =>
                  draft.setDraft((prev) => ({ ...prev, blockManageChannels }))
                }
              />
              <CheckRow
                label={p.permBanMembers}
                checked={d.blockBanMembers}
                onChange={(blockBanMembers) =>
                  draft.setDraft((prev) => ({ ...prev, blockBanMembers }))
                }
              />
              <CheckRow
                label={p.permKickMembers}
                checked={d.blockKickMembers}
                onChange={(blockKickMembers) =>
                  draft.setDraft((prev) => ({ ...prev, blockKickMembers }))
                }
              />
              <CheckRow
                label={p.permMentionEveryone}
                checked={d.blockMentionEveryone}
                onChange={(blockMentionEveryone) =>
                  draft.setDraft((prev) => ({ ...prev, blockMentionEveryone }))
                }
              />
            </div>
          </SectionCard>
          <SectionCard title={p.punishment} icon={Icon}>
            <div className="space-y-3">
              <CheckRow
                label={p.punishGrantee}
                checked={d.punishGrantee}
                onChange={(punishGrantee) =>
                  draft.setDraft((prev) => ({ ...prev, punishGrantee }))
                }
              />
              <CheckRow
                label={p.punishExecutor}
                checked={d.punishExecutor}
                onChange={(punishExecutor) =>
                  draft.setDraft((prev) => ({ ...prev, punishExecutor }))
                }
              />
              <SelectField
                label={p.punishment}
                value={d.punishment}
                onChange={(punishment) =>
                  draft.setDraft((prev) => ({ ...prev, punishment }))
                }
                options={punishOptions}
              />
              <label className="block text-sm">
                <span className="text-muted-foreground">
                  {p.trustedUserIds}
                </span>
                <textarea
                  rows={4}
                  value={d.trustedUserIdsText}
                  onChange={(e) =>
                    draft.setDraft((prev) => ({
                      ...prev,
                      trustedUserIdsText: e.target.value,
                    }))
                  }
                  placeholder={p.trustedUserIdsHint}
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
              </label>
            </div>
          </SectionCard>
        </>
      ) : null}

      {feature === 'recovery' ? (
        <SectionCard title={p.recoverySettings} icon={Icon}>
          <div className="space-y-3">
            <CheckRow
              label={p.autoRestore}
              checked={d.autoRestore}
              onChange={(autoRestore) =>
                draft.setDraft((prev) => ({ ...prev, autoRestore }))
              }
            />
            <CheckRow
              label={p.alsoLockdown}
              checked={d.alsoLockdown}
              onChange={(alsoLockdown) =>
                draft.setDraft((prev) => ({ ...prev, alsoLockdown }))
              }
            />
            <label className="block text-sm">
              <span className="text-muted-foreground">
                {p.restoreChannelThreshold}
              </span>
              <input
                type="number"
                min={1}
                max={20}
                value={d.restoreChannelThreshold}
                onChange={(e) =>
                  draft.setDraft((prev) => ({
                    ...prev,
                    restoreChannelThreshold: Number(e.target.value),
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">{p.windowSeconds}</span>
              <input
                type="number"
                min={10}
                max={300}
                value={d.windowSeconds}
                onChange={(e) =>
                  draft.setDraft((prev) => ({
                    ...prev,
                    windowSeconds: Number(e.target.value),
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>
            {d.lastSnapshotAt ? (
              <p className="text-xs text-muted-foreground">
                {p.lastSnapshot}: {new Date(d.lastSnapshotAt).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{p.noSnapshotYet}</p>
            )}
          </div>
        </SectionCard>
      ) : null}

      {feature === 'anti-prune' ? (
        <SectionCard title={p.punishment} icon={Icon}>
          <div className="space-y-3">
            <SelectField
              label={p.punishment}
              value={d.punishment}
              onChange={(punishment) =>
                draft.setDraft((prev) => ({ ...prev, punishment }))
              }
              options={punishOptions}
            />
            <CheckRow
              label={p.alsoLockdown}
              checked={d.alsoLockdown}
              onChange={(alsoLockdown) =>
                draft.setDraft((prev) => ({ ...prev, alsoLockdown }))
              }
            />
          </div>
        </SectionCard>
      ) : null}

      {feature === 'anti-server' ? (
        <>
          <SectionCard title={p.antiServerWatch} icon={Icon}>
            <div className="space-y-2">
              <CheckRow
                label={p.blockVanity}
                checked={d.blockVanity}
                onChange={(blockVanity) =>
                  draft.setDraft((prev) => ({ ...prev, blockVanity }))
                }
              />
              <CheckRow
                label={p.blockServerName}
                checked={d.blockName}
                onChange={(blockName) =>
                  draft.setDraft((prev) => ({ ...prev, blockName }))
                }
              />
              <CheckRow
                label={p.blockServerIcon}
                checked={d.blockIcon}
                onChange={(blockIcon) =>
                  draft.setDraft((prev) => ({ ...prev, blockIcon }))
                }
              />
              <CheckRow
                label={p.blockServerBanner}
                checked={d.blockBanner}
                onChange={(blockBanner) =>
                  draft.setDraft((prev) => ({ ...prev, blockBanner }))
                }
              />
              <CheckRow
                label={p.blockVerification}
                checked={d.blockVerification}
                onChange={(blockVerification) =>
                  draft.setDraft((prev) => ({ ...prev, blockVerification }))
                }
              />
            </div>
          </SectionCard>
          <SectionCard title={p.punishment} icon={Icon}>
            <div className="space-y-3">
              <SelectField
                label={p.punishment}
                value={d.punishment}
                onChange={(punishment) =>
                  draft.setDraft((prev) => ({ ...prev, punishment }))
                }
                options={punishOptions}
              />
              <CheckRow
                label={p.alsoLockdown}
                checked={d.alsoLockdown}
                onChange={(alsoLockdown) =>
                  draft.setDraft((prev) => ({ ...prev, alsoLockdown }))
                }
              />
            </div>
          </SectionCard>
        </>
      ) : null}

      <UnsavedChangesBar
        open={draft.isDirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={draft.discard}
      />
    </main>
  );
}
