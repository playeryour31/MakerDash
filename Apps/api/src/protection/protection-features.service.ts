import { BadRequestException, Injectable } from '@nestjs/common';
import { FeatureRepository } from '../prisma/repositories/feature.repository';
import { ProtectionService } from './protection.service';

export const PROTECTION_FEATURES = [
  'anti-nuke',
  'anti-bots',
  'whitelist',
  'anti-raid',
  'anti-spam',
  'anti-links',
  'join-gate',
  'lockdown',
  'automod',
  'anti-perms',
  'recovery',
  'anti-prune',
  'anti-server',
  'general',
] as const;

export type ProtectionFeatureKey = (typeof PROTECTION_FEATURES)[number];

export const PROTECTION_LEVELS = ['basic', 'balanced', 'strict'] as const;
export type ProtectionLevelId = (typeof PROTECTION_LEVELS)[number];
export type ActiveProtectionLevel = ProtectionLevelId | 'custom' | null;

const NS = 'protection';

const NUKE_ACTIONS = [
  'ban',
  'kick',
  'delete_roles',
  'create_roles',
  'delete_channel',
  'create_channel',
  'add_bots',
] as const;

export type NukeAction = (typeof NUKE_ACTIONS)[number];

export type Punishment =
  | 'delete'
  | 'timeout'
  | 'kick'
  | 'ban'
  | 'strip_roles'
  | 'quarantine'
  | 'lockdown';

const KEYWORD_PRESETS = [
  'profanity',
  'sexual_content',
  'slurs',
] as const;

type KeywordPreset = (typeof KEYWORD_PRESETS)[number];

function isFeature(value: string): value is ProtectionFeatureKey {
  return (PROTECTION_FEATURES as readonly string[]).includes(value);
}

function isLevel(value: string): value is ProtectionLevelId {
  return (PROTECTION_LEVELS as readonly string[]).includes(value);
}

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(v)));
}

function asPunishment(value: unknown, fallback: Punishment): Punishment {
  const allowed: Punishment[] = [
    'delete',
    'timeout',
    'kick',
    'ban',
    'strip_roles',
    'quarantine',
    'lockdown',
  ];
  const v = String(value || '').toLowerCase();
  return (allowed.includes(v as Punishment) ? v : fallback) as Punishment;
}

function asStringArray(value: unknown, max = 50): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean).slice(0, max);
}

function nukeBundle(
  limit: number,
  mode: string,
  windowMinutes: number,
  enabled = true,
) {
  const limits: Record<string, number> = {};
  const autoModes: Record<string, string> = {};
  for (const action of NUKE_ACTIONS) {
    limits[action] = limit;
    autoModes[action] = mode;
  }
  return { enabled, limits, autoModes, windowMinutes };
}

function defaultAntiNuke() {
  return nukeBundle(5, 'strip_roles', 20, true);
}

function defaultAntiBots() {
  return { enabled: false, mode: 'off' as 'on' | 'off' };
}

function defaultAntiRaid() {
  return {
    enabled: false,
    joinThreshold: 8,
    windowSeconds: 12,
    punishment: 'kick' as Punishment,
    alsoLockdown: false,
  };
}

function defaultAntiSpam() {
  return {
    enabled: false,
    maxMessages: 6,
    windowSeconds: 5,
    maxMentions: 5,
    blockEveryone: true,
    punishment: 'timeout' as Punishment,
    timeoutSeconds: 300,
  };
}

function defaultAntiLinks() {
  return {
    enabled: false,
    blockInvites: true,
    blockLinks: true,
    blockWebhooks: true,
    allowedDomains: [] as string[],
    exemptRoleIds: [] as string[],
    exemptChannelIds: [] as string[],
    punishment: 'delete' as Punishment,
  };
}

function defaultJoinGate() {
  return {
    enabled: false,
    minAccountAgeDays: 3,
    punishment: 'kick' as Punishment,
    quarantineRoleId: '',
  };
}

function defaultLockdown() {
  return {
    enabled: false,
    active: false,
    muteEveryone: true,
    blockJoins: false,
    reason: '',
  };
}

function defaultGeneral() {
  return {
    logChannelId: '',
    notifyOwner: true,
  };
}

function defaultWhitelist() {
  return {
    entries: [] as Array<{ userId: string; actions: string[] }>,
  };
}

function defaultAutomod() {
  return {
    enabled: false,
    alertChannelId: '',
    blockInvites: true,
    blockLinks: false,
    mentionSpamLimit: 0,
    keywordPresets: [] as KeywordPreset[],
    customKeywords: [] as string[],
    timeoutSeconds: 0,
    syncedRuleIds: [] as string[],
    lastSyncError: '',
    lastSyncedAt: null as string | null,
  };
}

function defaultAntiPerms() {
  return {
    enabled: false,
    punishGrantee: true,
    punishExecutor: true,
    punishment: 'strip_roles' as Punishment,
    trustedUserIds: [] as string[],
    blockAdministrator: true,
    blockManageGuild: true,
    blockManageRoles: true,
    blockManageChannels: true,
    blockBanMembers: true,
    blockKickMembers: true,
    blockMentionEveryone: true,
  };
}

function defaultRecovery() {
  return {
    enabled: false,
    autoRestore: true,
    snapshotIntervalMinutes: 10,
    restoreChannelThreshold: 3,
    windowSeconds: 45,
    alsoLockdown: true,
    lastSnapshotAt: null as string | null,
  };
}

function defaultAntiPrune() {
  return {
    enabled: false,
    punishment: 'ban' as Punishment,
    alsoLockdown: true,
  };
}

function defaultAntiServer() {
  return {
    enabled: false,
    blockVanity: true,
    blockName: true,
    blockIcon: true,
    blockBanner: true,
    blockVerification: true,
    punishment: 'strip_roles' as Punishment,
    alsoLockdown: false,
  };
}

/** Feature bundles applied by Protection Levels (whitelist + logChannel preserved). */
export const LEVEL_PRESETS: Record<
  ProtectionLevelId,
  Record<string, Record<string, unknown>>
> = {
  basic: {
    'anti-nuke': nukeBundle(8, 'strip_roles', 20, true),
    'anti-bots': { enabled: false, mode: 'off' },
    'anti-raid': {
      enabled: true,
      joinThreshold: 12,
      windowSeconds: 15,
      punishment: 'kick',
      alsoLockdown: false,
    },
    'anti-spam': {
      enabled: true,
      maxMessages: 8,
      windowSeconds: 5,
      maxMentions: 8,
      blockEveryone: true,
      punishment: 'timeout',
      timeoutSeconds: 180,
    },
    'anti-links': {
      enabled: true,
      blockInvites: true,
      blockLinks: false,
      blockWebhooks: true,
      allowedDomains: [],
      exemptRoleIds: [],
      exemptChannelIds: [],
      punishment: 'delete',
    },
    'join-gate': {
      enabled: true,
      minAccountAgeDays: 1,
      punishment: 'kick',
      quarantineRoleId: '',
    },
    lockdown: {
      enabled: true,
      active: false,
      muteEveryone: true,
      blockJoins: false,
      reason: '',
    },
    automod: {
      enabled: true,
      alertChannelId: '',
      blockInvites: true,
      blockLinks: false,
      mentionSpamLimit: 8,
      keywordPresets: [],
      customKeywords: [],
      timeoutSeconds: 0,
      syncedRuleIds: [],
      lastSyncError: '',
      lastSyncedAt: null,
    },
    'anti-perms': {
      enabled: true,
      punishGrantee: true,
      punishExecutor: true,
      punishment: 'strip_roles',
      trustedUserIds: [],
      blockAdministrator: true,
      blockManageGuild: true,
      blockManageRoles: false,
      blockManageChannels: false,
      blockBanMembers: false,
      blockKickMembers: false,
      blockMentionEveryone: true,
    },
    recovery: {
      enabled: false,
      autoRestore: true,
      snapshotIntervalMinutes: 15,
      restoreChannelThreshold: 5,
      windowSeconds: 60,
      alsoLockdown: false,
      lastSnapshotAt: null,
    },
    'anti-prune': {
      enabled: false,
      punishment: 'ban',
      alsoLockdown: false,
    },
    'anti-server': {
      enabled: true,
      blockVanity: true,
      blockName: false,
      blockIcon: false,
      blockBanner: false,
      blockVerification: true,
      punishment: 'strip_roles',
      alsoLockdown: false,
    },
  },
  balanced: {
    'anti-nuke': nukeBundle(5, 'strip_roles', 20, true),
    'anti-bots': { enabled: false, mode: 'off' },
    'anti-raid': {
      enabled: true,
      joinThreshold: 8,
      windowSeconds: 12,
      punishment: 'kick',
      alsoLockdown: false,
    },
    'anti-spam': {
      enabled: true,
      maxMessages: 6,
      windowSeconds: 5,
      maxMentions: 5,
      blockEveryone: true,
      punishment: 'timeout',
      timeoutSeconds: 300,
    },
    'anti-links': {
      enabled: true,
      blockInvites: true,
      blockLinks: true,
      blockWebhooks: true,
      allowedDomains: [],
      exemptRoleIds: [],
      exemptChannelIds: [],
      punishment: 'delete',
    },
    'join-gate': {
      enabled: true,
      minAccountAgeDays: 3,
      punishment: 'kick',
      quarantineRoleId: '',
    },
    lockdown: {
      enabled: true,
      active: false,
      muteEveryone: true,
      blockJoins: false,
      reason: '',
    },
    automod: {
      enabled: true,
      alertChannelId: '',
      blockInvites: true,
      blockLinks: false,
      mentionSpamLimit: 5,
      keywordPresets: ['profanity', 'slurs'],
      customKeywords: [],
      timeoutSeconds: 0,
      syncedRuleIds: [],
      lastSyncError: '',
      lastSyncedAt: null,
    },
    'anti-perms': {
      enabled: true,
      punishGrantee: true,
      punishExecutor: true,
      punishment: 'strip_roles',
      trustedUserIds: [],
      blockAdministrator: true,
      blockManageGuild: true,
      blockManageRoles: true,
      blockManageChannels: true,
      blockBanMembers: true,
      blockKickMembers: false,
      blockMentionEveryone: true,
    },
    recovery: {
      enabled: true,
      autoRestore: true,
      snapshotIntervalMinutes: 10,
      restoreChannelThreshold: 3,
      windowSeconds: 45,
      alsoLockdown: true,
      lastSnapshotAt: null,
    },
    'anti-prune': {
      enabled: true,
      punishment: 'ban',
      alsoLockdown: true,
    },
    'anti-server': {
      enabled: true,
      blockVanity: true,
      blockName: true,
      blockIcon: true,
      blockBanner: true,
      blockVerification: true,
      punishment: 'strip_roles',
      alsoLockdown: false,
    },
  },
  strict: {
    'anti-nuke': nukeBundle(3, 'ban', 15, true),
    'anti-bots': { enabled: true, mode: 'on' },
    'anti-raid': {
      enabled: true,
      joinThreshold: 5,
      windowSeconds: 10,
      punishment: 'ban',
      alsoLockdown: true,
    },
    'anti-spam': {
      enabled: true,
      maxMessages: 4,
      windowSeconds: 5,
      maxMentions: 3,
      blockEveryone: true,
      punishment: 'timeout',
      timeoutSeconds: 600,
    },
    'anti-links': {
      enabled: true,
      blockInvites: true,
      blockLinks: true,
      blockWebhooks: true,
      allowedDomains: [],
      exemptRoleIds: [],
      exemptChannelIds: [],
      punishment: 'timeout',
    },
    'join-gate': {
      enabled: true,
      minAccountAgeDays: 7,
      punishment: 'quarantine',
      quarantineRoleId: '',
    },
    lockdown: {
      enabled: true,
      active: false,
      muteEveryone: true,
      blockJoins: true,
      reason: 'Strict protection level',
    },
    automod: {
      enabled: true,
      alertChannelId: '',
      blockInvites: true,
      blockLinks: true,
      mentionSpamLimit: 3,
      keywordPresets: ['profanity', 'sexual_content', 'slurs'],
      customKeywords: [],
      timeoutSeconds: 300,
      syncedRuleIds: [],
      lastSyncError: '',
      lastSyncedAt: null,
    },
    'anti-perms': {
      enabled: true,
      punishGrantee: true,
      punishExecutor: true,
      punishment: 'ban',
      trustedUserIds: [],
      blockAdministrator: true,
      blockManageGuild: true,
      blockManageRoles: true,
      blockManageChannels: true,
      blockBanMembers: true,
      blockKickMembers: true,
      blockMentionEveryone: true,
    },
    recovery: {
      enabled: true,
      autoRestore: true,
      snapshotIntervalMinutes: 5,
      restoreChannelThreshold: 2,
      windowSeconds: 30,
      alsoLockdown: true,
      lastSnapshotAt: null,
    },
    'anti-prune': {
      enabled: true,
      punishment: 'ban',
      alsoLockdown: true,
    },
    'anti-server': {
      enabled: true,
      blockVanity: true,
      blockName: true,
      blockIcon: true,
      blockBanner: true,
      blockVerification: true,
      punishment: 'ban',
      alsoLockdown: true,
    },
  },
};

const LEVEL_SUMMARIES: Record<
  ProtectionLevelId,
  { highlights: string[] }
> = {
  basic: {
    highlights: [
      'antiNuke',
      'antiRaid',
      'antiSpam',
      'joinGate',
      'automodInvites',
    ],
  },
  balanced: {
    highlights: [
      'antiNuke',
      'antiRaid',
      'antiSpam',
      'antiLinks',
      'automodPresets',
    ],
  },
  strict: {
    highlights: [
      'antiBots',
      'antiRaidLockdown',
      'strictSpam',
      'joinGateStrict',
      'automodFull',
    ],
  },
};

function defaults(feature: ProtectionFeatureKey): Record<string, unknown> {
  switch (feature) {
    case 'anti-nuke':
      return defaultAntiNuke();
    case 'anti-bots':
      return defaultAntiBots();
    case 'whitelist':
      return defaultWhitelist();
    case 'anti-raid':
      return defaultAntiRaid();
    case 'anti-spam':
      return defaultAntiSpam();
    case 'anti-links':
      return defaultAntiLinks();
    case 'join-gate':
      return defaultJoinGate();
    case 'lockdown':
      return defaultLockdown();
    case 'automod':
      return defaultAutomod();
    case 'anti-perms':
      return defaultAntiPerms();
    case 'recovery':
      return defaultRecovery();
    case 'anti-prune':
      return defaultAntiPrune();
    case 'anti-server':
      return defaultAntiServer();
    case 'general':
      return defaultGeneral();
  }
}

@Injectable()
export class ProtectionFeaturesService {
  constructor(
    private readonly features: FeatureRepository,
    private readonly protection: ProtectionService,
  ) {}

  private configKey(guildId: string, botId: string) {
    return `protectionConfig_${guildId}_${botId}`;
  }

  list(_botId: string) {
    return PROTECTION_FEATURES.filter((f) => f !== 'general').map((id) => ({
      id,
    }));
  }

  private async readUnified(
    guildId: string | null,
    botId: string,
  ): Promise<Record<string, any>> {
    if (!guildId) return {};
    const raw = await this.features.get(NS, this.configKey(guildId, botId));
    return raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  }

  private async writeUnified(
    guildId: string,
    botId: string,
    value: Record<string, any>,
  ) {
    await this.features.set(NS, this.configKey(guildId, botId), value, botId);
  }

  private async readLegacyAntiBots(guildId: string, botId: string) {
    const v = await this.features.get(NS, `antiBots_${guildId}_${botId}`);
    const mode = String(v || 'off').toLowerCase() === 'on' ? 'on' : 'off';
    return { enabled: mode === 'on', mode };
  }

  private async readLegacyNuke(guildId: string, botId: string) {
    const base = defaultAntiNuke();
    let anySet = false;
    for (const action of NUKE_ACTIONS) {
      const limit = await this.features.get(
        NS,
        `actionLimit_${action}_${guildId}_${botId}`,
      );
      const mode = await this.features.get(
        NS,
        `autoMode_${action}_${guildId}_${botId}`,
      );
      if (limit != null && limit !== undefined) {
        base.limits[action] = clampInt(limit, 1, 100, 5);
        anySet = true;
      }
      if (mode != null && mode !== undefined) {
        const m = String(mode);
        base.autoModes[action] =
          m === 'ban' ||
          m === 'kick' ||
          m === 'delete_roles' ||
          m === 'strip_roles'
            ? m === 'delete_roles'
              ? 'strip_roles'
              : m
            : 'strip_roles';
        anySet = true;
      }
    }
    base.enabled = anySet ? true : base.enabled;
    return base;
  }

  private async readLegacyLog(guildId: string, botId: string) {
    const v = await this.features.get(NS, `protectionLog_${guildId}_${botId}`);
    return { logChannelId: v ? String(v) : '', notifyOwner: true };
  }

  private async readLegacyWhitelist(guildId: string, botId: string) {
    const map = await this.features.getNamespaceMap(NS);
    const prefix = `whiteList_${guildId}_`;
    const suffix = `_${botId}`;
    const entries: Array<{ userId: string; actions: string[] }> = [];
    for (const [key, value] of Object.entries(map)) {
      if (!key.startsWith(prefix) || !key.endsWith(suffix)) continue;
      const mid = key.slice(prefix.length, key.length - suffix.length);
      const userId = mid;
      if (!/^\d{5,}$/.test(userId)) continue;
      const actions = Array.isArray(value)
        ? value.map(String)
        : typeof value === 'string'
          ? [value]
          : [];
      entries.push({ userId, actions: actions.length ? actions : ['all'] });
    }
    return { entries };
  }

  private parseActiveLevel(raw: unknown): ActiveProtectionLevel {
    if (raw == null || raw === '') return null;
    const v = String(raw);
    if (v === 'custom') return 'custom';
    if (isLevel(v)) return v;
    return null;
  }

  async getFeature(botId: string, feature: string) {
    const bot = await this.protection.ensureProtectionBot(botId);
    if (!isFeature(feature)) {
      throw new BadRequestException(`Unknown feature: ${feature}`);
    }
    const guildId = this.protection.guildIdOf(bot);
    const unified = await this.readUnified(guildId, botId);
    let settings: Record<string, unknown> = {
      ...defaults(feature),
      ...(unified[feature] && typeof unified[feature] === 'object'
        ? unified[feature]
        : {}),
    };

    if (guildId) {
      if (feature === 'anti-bots') {
        const legacy = await this.readLegacyAntiBots(guildId, botId);
        if (!unified[feature]) settings = { ...settings, ...legacy };
      }
      if (feature === 'anti-nuke') {
        if (!unified[feature]) {
          settings = {
            ...settings,
            ...(await this.readLegacyNuke(guildId, botId)),
          };
        }
      }
      if (feature === 'general') {
        if (!unified[feature]?.logChannelId) {
          const legacy = await this.readLegacyLog(guildId, botId);
          settings = { ...settings, ...legacy };
        }
      }
      if (feature === 'whitelist') {
        if (
          !unified[feature] ||
          !Array.isArray(unified[feature]?.entries) ||
          unified[feature].entries.length === 0
        ) {
          settings = {
            ...settings,
            ...(await this.readLegacyWhitelist(guildId, botId)),
          };
        }
      }
    }

    return { botId, feature, settings, guildId };
  }

  private normalizeFeature(
    feature: ProtectionFeatureKey,
    patch: Record<string, unknown>,
    current: Record<string, unknown>,
  ): Record<string, unknown> {
    const next = { ...current, ...patch };
    switch (feature) {
      case 'anti-nuke': {
        const limits: Record<string, number> = {};
        const autoModes: Record<string, string> = {};
        const srcLimits =
          (next.limits as Record<string, unknown>) || defaultAntiNuke().limits;
        const srcModes =
          (next.autoModes as Record<string, unknown>) ||
          defaultAntiNuke().autoModes;
        for (const action of NUKE_ACTIONS) {
          limits[action] = clampInt(srcLimits[action], 1, 100, 5);
          const m = String(srcModes[action] || 'strip_roles');
          autoModes[action] =
            m === 'ban' ||
            m === 'kick' ||
            m === 'strip_roles' ||
            m === 'delete_roles'
              ? m === 'delete_roles'
                ? 'strip_roles'
                : m
              : 'strip_roles';
        }
        return {
          enabled: next.enabled !== false,
          limits,
          autoModes,
          windowMinutes: clampInt(next.windowMinutes, 1, 120, 20),
        };
      }
      case 'anti-bots': {
        const mode =
          next.enabled === true || String(next.mode).toLowerCase() === 'on'
            ? 'on'
            : 'off';
        return { enabled: mode === 'on', mode };
      }
      case 'whitelist': {
        const entries = Array.isArray(next.entries)
          ? next.entries
              .slice(0, 200)
              .map((e: any) => ({
                userId: String(e?.userId || '').trim(),
                actions: asStringArray(e?.actions || ['all'], 20),
              }))
              .filter((e) => /^\d{5,}$/.test(e.userId))
          : [];
        return { entries };
      }
      case 'anti-raid':
        return {
          enabled: Boolean(next.enabled),
          joinThreshold: clampInt(next.joinThreshold, 2, 50, 8),
          windowSeconds: clampInt(next.windowSeconds, 3, 120, 12),
          punishment: asPunishment(next.punishment, 'kick'),
          alsoLockdown: Boolean(next.alsoLockdown),
        };
      case 'anti-spam':
        return {
          enabled: Boolean(next.enabled),
          maxMessages: clampInt(next.maxMessages, 2, 30, 6),
          windowSeconds: clampInt(next.windowSeconds, 2, 60, 5),
          maxMentions: clampInt(next.maxMentions, 1, 30, 5),
          blockEveryone: next.blockEveryone !== false,
          punishment: asPunishment(next.punishment, 'timeout'),
          timeoutSeconds: clampInt(next.timeoutSeconds, 10, 2419200, 300),
        };
      case 'anti-links':
        return {
          enabled: Boolean(next.enabled),
          blockInvites: next.blockInvites !== false,
          blockLinks: next.blockLinks !== false,
          blockWebhooks: next.blockWebhooks !== false,
          allowedDomains: asStringArray(next.allowedDomains, 40).map((d) =>
            d.toLowerCase().replace(/^https?:\/\//, '').split('/')[0],
          ),
          exemptRoleIds: asStringArray(next.exemptRoleIds, 25),
          exemptChannelIds: asStringArray(next.exemptChannelIds, 25),
          punishment: asPunishment(next.punishment, 'delete'),
        };
      case 'join-gate':
        return {
          enabled: Boolean(next.enabled),
          minAccountAgeDays: clampInt(next.minAccountAgeDays, 0, 365, 3),
          punishment: asPunishment(next.punishment, 'kick'),
          quarantineRoleId: String(next.quarantineRoleId || '').trim(),
        };
      case 'lockdown':
        return {
          enabled: Boolean(next.enabled),
          active: Boolean(next.active),
          muteEveryone: next.muteEveryone !== false,
          blockJoins: Boolean(next.blockJoins),
          reason: String(next.reason || '').slice(0, 200),
        };
      case 'automod': {
        const presets = asStringArray(next.keywordPresets, 3).filter((p) =>
          (KEYWORD_PRESETS as readonly string[]).includes(p),
        ) as KeywordPreset[];
        return {
          enabled: Boolean(next.enabled),
          alertChannelId: String(next.alertChannelId || '').trim(),
          blockInvites: next.blockInvites !== false,
          blockLinks: Boolean(next.blockLinks),
          mentionSpamLimit: clampInt(next.mentionSpamLimit, 0, 50, 0),
          keywordPresets: presets,
          customKeywords: asStringArray(next.customKeywords, 40).map((k) =>
            k.slice(0, 60),
          ),
          timeoutSeconds: clampInt(next.timeoutSeconds, 0, 2419200, 0),
          syncedRuleIds: asStringArray(
            next.syncedRuleIds ?? current.syncedRuleIds,
            20,
          ),
          lastSyncError: String(
            next.lastSyncError ?? current.lastSyncError ?? '',
          ).slice(0, 300),
          lastSyncedAt:
            next.lastSyncedAt != null
              ? String(next.lastSyncedAt)
              : current.lastSyncedAt != null
                ? String(current.lastSyncedAt)
                : null,
        };
      }
      case 'anti-perms':
        return {
          enabled: Boolean(next.enabled),
          punishGrantee: next.punishGrantee !== false,
          punishExecutor: next.punishExecutor !== false,
          punishment: asPunishment(next.punishment, 'strip_roles'),
          trustedUserIds: asStringArray(next.trustedUserIds, 50).filter((id) =>
            /^\d{5,}$/.test(id),
          ),
          blockAdministrator: next.blockAdministrator !== false,
          blockManageGuild: next.blockManageGuild !== false,
          blockManageRoles: Boolean(next.blockManageRoles),
          blockManageChannels: Boolean(next.blockManageChannels),
          blockBanMembers: Boolean(next.blockBanMembers),
          blockKickMembers: Boolean(next.blockKickMembers),
          blockMentionEveryone: next.blockMentionEveryone !== false,
        };
      case 'recovery':
        return {
          enabled: Boolean(next.enabled),
          autoRestore: next.autoRestore !== false,
          snapshotIntervalMinutes: clampInt(
            next.snapshotIntervalMinutes,
            3,
            120,
            10,
          ),
          restoreChannelThreshold: clampInt(
            next.restoreChannelThreshold,
            1,
            20,
            3,
          ),
          windowSeconds: clampInt(next.windowSeconds, 10, 300, 45),
          alsoLockdown: Boolean(next.alsoLockdown),
          lastSnapshotAt:
            next.lastSnapshotAt != null
              ? String(next.lastSnapshotAt)
              : current.lastSnapshotAt != null
                ? String(current.lastSnapshotAt)
                : null,
        };
      case 'anti-prune':
        return {
          enabled: Boolean(next.enabled),
          punishment: asPunishment(next.punishment, 'ban'),
          alsoLockdown: next.alsoLockdown !== false,
        };
      case 'anti-server':
        return {
          enabled: Boolean(next.enabled),
          blockVanity: next.blockVanity !== false,
          blockName: Boolean(next.blockName),
          blockIcon: Boolean(next.blockIcon),
          blockBanner: Boolean(next.blockBanner),
          blockVerification: next.blockVerification !== false,
          punishment: asPunishment(next.punishment, 'strip_roles'),
          alsoLockdown: Boolean(next.alsoLockdown),
        };
      case 'general':
        return {
          logChannelId: String(next.logChannelId || '').trim(),
          notifyOwner: next.notifyOwner !== false,
        };
    }
  }

  private async syncLegacyKeys(
    guildId: string,
    botId: string,
    feature: ProtectionFeatureKey,
    settings: Record<string, any>,
  ) {
    if (feature === 'anti-bots') {
      await this.features.set(
        NS,
        `antiBots_${guildId}_${botId}`,
        settings.mode === 'on' ? 'on' : 'off',
        botId,
      );
    }
    if (feature === 'anti-nuke') {
      for (const action of NUKE_ACTIONS) {
        await this.features.set(
          NS,
          `actionLimit_${action}_${guildId}_${botId}`,
          settings.limits?.[action] ?? 5,
          botId,
        );
        const mode = settings.autoModes?.[action] || 'strip_roles';
        await this.features.set(
          NS,
          `autoMode_${action}_${guildId}_${botId}`,
          mode === 'strip_roles' ? 'delete_roles' : mode,
          botId,
        );
      }
      await this.features.set(
        NS,
        `protectionTimer_${botId}`,
        (await this.features.get(NS, `protectionTimer_${botId}`)) || [],
        botId,
      );
    }
    if (feature === 'general') {
      const channelId = String(settings.logChannelId || '');
      if (channelId) {
        await this.features.set(
          NS,
          `protectionLog_${guildId}_${botId}`,
          channelId,
          botId,
        );
      }
    }
    if (feature === 'whitelist') {
      const map = await this.features.getNamespaceMap(NS);
      const prefix = `whiteList_${guildId}_`;
      const suffix = `_${botId}`;
      for (const key of Object.keys(map)) {
        if (key.startsWith(prefix) && key.endsWith(suffix)) {
          await this.features.delete(NS, key);
        }
      }
      for (const entry of settings.entries || []) {
        await this.features.set(
          NS,
          `whiteList_${guildId}_${entry.userId}_${botId}`,
          entry.actions?.length ? entry.actions : ['all'],
          botId,
        );
      }
    }
  }

  async updateFeature(
    botId: string,
    feature: string,
    patch: Record<string, unknown>,
  ) {
    const bot = await this.protection.ensureProtectionBot(botId);
    if (!isFeature(feature)) {
      throw new BadRequestException(`Unknown feature: ${feature}`);
    }
    const guildId = this.protection.guildIdOf(bot);
    if (!guildId) {
      throw new BadRequestException('Bot is not linked to a guild yet');
    }
    const current = await this.getFeature(botId, feature);
    const normalized = this.normalizeFeature(
      feature,
      patch || {},
      current.settings,
    );
    const unified = await this.readUnified(guildId, botId);
    unified[feature] = normalized;
    // Manual edits leave preset mode
    if (feature !== 'general' && feature !== 'whitelist') {
      unified.activeLevel = 'custom';
    }
    await this.writeUnified(guildId, botId, unified);
    await this.syncLegacyKeys(guildId, botId, feature, normalized);
    return this.getFeature(botId, feature);
  }

  async getLevels(botId: string) {
    const bot = await this.protection.ensureProtectionBot(botId);
    const guildId = this.protection.guildIdOf(bot);
    const unified = await this.readUnified(guildId, botId);
    const activeLevel = this.parseActiveLevel(unified.activeLevel);
    return {
      botId,
      guildId,
      activeLevel,
      levels: PROTECTION_LEVELS.map((id) => ({
        id,
        highlights: LEVEL_SUMMARIES[id].highlights,
      })),
    };
  }

  async applyLevel(botId: string, levelRaw: string) {
    const bot = await this.protection.ensureProtectionBot(botId);
    const level = String(levelRaw || '').toLowerCase();
    if (!isLevel(level)) {
      throw new BadRequestException(
        `Invalid level. Use: ${PROTECTION_LEVELS.join(', ')}`,
      );
    }
    const guildId = this.protection.guildIdOf(bot);
    if (!guildId) {
      throw new BadRequestException('Bot is not linked to a guild yet');
    }

    const unified = await this.readUnified(guildId, botId);
    const preserveWhitelist =
      unified.whitelist && typeof unified.whitelist === 'object'
        ? unified.whitelist
        : defaultWhitelist();
    const preserveGeneral = {
      ...defaultGeneral(),
      ...(unified.general && typeof unified.general === 'object'
        ? unified.general
        : {}),
    };
    const existingAutomod =
      unified.automod && typeof unified.automod === 'object'
        ? unified.automod
        : {};
    const preset = LEVEL_PRESETS[level];
    const next: Record<string, any> = {
      ...unified,
      activeLevel: level,
      whitelist: preserveWhitelist,
      general: preserveGeneral,
    };

    for (const [feature, rawSettings] of Object.entries(preset)) {
      if (!isFeature(feature)) continue;
      let patch = { ...rawSettings };
      if (feature === 'automod') {
        // Keep alert channel + previously synced rule IDs across level apply
        patch = {
          ...patch,
          alertChannelId:
            existingAutomod.alertChannelId ||
            preserveGeneral.logChannelId ||
            '',
          syncedRuleIds: Array.isArray(existingAutomod.syncedRuleIds)
            ? existingAutomod.syncedRuleIds
            : [],
          lastSyncError: '',
          lastSyncedAt: existingAutomod.lastSyncedAt || null,
        };
      }
      if (feature === 'join-gate' && unified['join-gate']?.quarantineRoleId) {
        patch = {
          ...patch,
          quarantineRoleId: String(unified['join-gate'].quarantineRoleId),
        };
      }
      const current = {
        ...defaults(feature),
        ...(unified[feature] && typeof unified[feature] === 'object'
          ? unified[feature]
          : {}),
      };
      const normalized = this.normalizeFeature(feature, patch, current);
      next[feature] = normalized;
      await this.syncLegacyKeys(guildId, botId, feature, normalized);
    }

    await this.writeUnified(guildId, botId, next);
    const extras = await this.overviewExtras(botId);
    return {
      botId,
      guildId,
      activeLevel: level as ProtectionLevelId,
      ...extras,
    };
  }

  async overviewExtras(botId: string) {
    const bot = await this.protection.ensureProtectionBot(botId);
    const guildId = this.protection.guildIdOf(bot);
    const unified = await this.readUnified(guildId, botId);
    const featureIds = PROTECTION_FEATURES.filter((f) => f !== 'general');
    const features = await Promise.all(
      featureIds.map(async (id) => {
        const { settings } = await this.getFeature(botId, id);
        const enabled =
          id === 'whitelist'
            ? Array.isArray((settings as any).entries) &&
              (settings as any).entries.length > 0
            : id === 'lockdown'
              ? Boolean((settings as any).active || (settings as any).enabled)
              : Boolean((settings as any).enabled);
        return { id, enabled };
      }),
    );
    const general = await this.getFeature(botId, 'general');
    const automod = await this.getFeature(botId, 'automod');
    return {
      features,
      logChannelId: String((general.settings as any).logChannelId || ''),
      activeLevel: this.parseActiveLevel(unified.activeLevel),
      automod: {
        enabled: Boolean((automod.settings as any).enabled),
        lastSyncError: String((automod.settings as any).lastSyncError || ''),
        lastSyncedAt: (automod.settings as any).lastSyncedAt || null,
      },
    };
  }
}
