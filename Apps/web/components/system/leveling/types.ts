export type TabKey = 'setup' | 'rules' | 'rewards' | 'display' | 'members';

export type GuildOptions = {
  channels: Array<{ id: string; name: string; type: number }>;
  roles: Array<{ id: string; name: string; color?: number; managed?: boolean }>;
};

export type Multiplier = {
  id: string;
  targetType: 'role' | 'channel' | 'user';
  targetId: string;
  multiplier: number;
  enabled: boolean;
};

export type Reward = {
  id: string;
  level: number;
  type: 'role' | 'message';
  value: string;
  description: string;
  enabled: boolean;
};

export type LevelingDraft = {
  enabled: boolean;
  xpMin: number;
  xpMax: number;
  cooldownSeconds: number;
  levelUpMode: 'disabled' | 'current' | 'channel';
  channelId: string;
  levelUpMessage: string;
  voiceXpEnabled: boolean;
  voiceXpPerMinute: number;
  voiceMinUsers: number;
  voiceIgnoreAfk: boolean;
  voiceIgnoreMuted: boolean;
  voiceIgnoreDeafened: boolean;
  multipliers: Multiplier[];
  ignoredChannelIds: string[];
  ignoredRoleIds: string[];
  rewards: Reward[];
  curveMode: 'linear' | 'progressive' | 'custom';
  curveBaseXp: number;
  curveGrowth: number;
  customCurve: Array<{ level: number; xp: number }>;
  removePreviousLevelRoles: boolean;
  keepPreviousRoles: boolean;
  rankCard: {
    enabled: boolean;
    backgroundColor: string;
    accentColor: string;
    textColor: string;
    progressColor: string;
    backgroundOpacity: number;
    showAvatar: boolean;
    showUsername: boolean;
    showLevel: boolean;
    showXp: boolean;
    showRank: boolean;
  };
  leaderboard: {
    enabled: boolean;
    isPublic: boolean;
    sortBy: 'xp' | 'level';
    displayCount: number;
    excludedUserIds: string[];
    excludedRoleIds: string[];
  };
  antiSpam: {
    duplicateMessageProtection: boolean;
    minMessageLength: number;
    ignoreBots: boolean;
    ignoreWebhooks: boolean;
  };
  curvePreview?: Array<{
    level: number;
    xpToNext: number;
    cumulativeXp: number;
  }>;
  overview?: Record<string, unknown>;
};

export type LevelingUser = {
  userId: string;
  xp: number;
  level: number;
  rank: number | null;
  xpToNext: number;
  progressXp: number;
};

export const EMPTY_LEVELING: LevelingDraft = {
  enabled: false,
  xpMin: 15,
  xpMax: 25,
  cooldownSeconds: 60,
  levelUpMode: 'channel',
  channelId: '',
  levelUpMessage:
    'Congratulations {user}! You reached level **{level}** ({xp} XP).',
  voiceXpEnabled: false,
  voiceXpPerMinute: 5,
  voiceMinUsers: 2,
  voiceIgnoreAfk: true,
  voiceIgnoreMuted: true,
  voiceIgnoreDeafened: true,
  multipliers: [],
  ignoredChannelIds: [],
  ignoredRoleIds: [],
  rewards: [],
  curveMode: 'progressive',
  curveBaseXp: 100,
  curveGrowth: 1.45,
  customCurve: [],
  removePreviousLevelRoles: false,
  keepPreviousRoles: true,
  rankCard: {
    enabled: true,
    backgroundColor: '#101018',
    accentColor: '#5b21b6',
    textColor: '#f2f2f7',
    progressColor: '#7c3aed',
    backgroundOpacity: 100,
    showAvatar: true,
    showUsername: true,
    showLevel: true,
    showXp: true,
    showRank: true,
  },
  leaderboard: {
    enabled: true,
    isPublic: true,
    sortBy: 'xp',
    displayCount: 10,
    excludedUserIds: [],
    excludedRoleIds: [],
  },
  antiSpam: {
    duplicateMessageProtection: true,
    minMessageLength: 2,
    ignoreBots: true,
    ignoreWebhooks: true,
  },
};

export function toDraft(settings: Record<string, any>): LevelingDraft {
  const remove = Boolean(settings.removePreviousLevelRoles);
  const keep =
    settings.keepPreviousRoles != null
      ? Boolean(settings.keepPreviousRoles)
      : !remove;
  return {
    ...EMPTY_LEVELING,
    ...settings,
    xpMin: Number(settings.xpMin ?? settings.xpPerMessage ?? 15),
    xpMax: Number(settings.xpMax ?? settings.xpPerMessage ?? 25),
    multipliers: Array.isArray(settings.multipliers) ? settings.multipliers : [],
    ignoredChannelIds: Array.isArray(settings.ignoredChannelIds)
      ? settings.ignoredChannelIds.map(String)
      : [],
    ignoredRoleIds: Array.isArray(settings.ignoredRoleIds)
      ? settings.ignoredRoleIds.map(String)
      : [],
    rewards: Array.isArray(settings.rewards) ? settings.rewards : [],
    customCurve: Array.isArray(settings.customCurve) ? settings.customCurve : [],
    removePreviousLevelRoles: remove,
    keepPreviousRoles: remove ? false : keep,
    rankCard: { ...EMPTY_LEVELING.rankCard, ...(settings.rankCard || {}) },
    leaderboard: {
      ...EMPTY_LEVELING.leaderboard,
      ...(settings.leaderboard || {}),
    },
    antiSpam: { ...EMPTY_LEVELING.antiSpam, ...(settings.antiSpam || {}) },
    curvePreview: settings.curvePreview,
    overview: settings.overview,
  };
}

export function toPatch(d: LevelingDraft): Record<string, unknown> {
  const { curvePreview: _c, overview: _o, ...rest } = d;
  return rest;
}

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function fillPreview(template: string) {
  return String(template || '')
    .replace(/\{user\}/gi, '@Amina')
    .replace(/\{username\}/gi, 'Amina')
    .replace(/\{level\}/gi, '12')
    .replace(/\{xp\}/gi, '4820')
    .replace(/\{server\}/gi, 'Volyx Hub');
}

export function roleStackMode(d: LevelingDraft): 'replace' | 'stack' {
  return d.removePreviousLevelRoles ? 'replace' : 'stack';
}

export function withRoleStackMode(
  d: LevelingDraft,
  mode: 'replace' | 'stack',
): LevelingDraft {
  return {
    ...d,
    removePreviousLevelRoles: mode === 'replace',
    keepPreviousRoles: mode === 'stack',
  };
}
