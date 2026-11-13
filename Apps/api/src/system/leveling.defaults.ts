import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type LevelUpMode = 'disabled' | 'current' | 'channel';
export type CurveMode = 'linear' | 'progressive' | 'custom';
export type MultiplierTarget = 'role' | 'channel' | 'user';
export type RewardType = 'role' | 'message';

export type XpMultiplier = {
  id: string;
  targetType: MultiplierTarget;
  targetId: string;
  multiplier: number;
  enabled: boolean;
};

export type LevelReward = {
  id: string;
  level: number;
  type: RewardType;
  value: string;
  description: string;
  enabled: boolean;
};

export type LevelingSettings = {
  enabled: boolean;
  xpMin: number;
  xpMax: number;
  /** @deprecated legacy single XP — migrated into xpMin/xpMax */
  xpPerMessage?: number;
  cooldownSeconds: number;
  levelUpMode: LevelUpMode;
  channelId: string;
  levelUpMessage: string;
  voiceXpEnabled: boolean;
  voiceXpPerMinute: number;
  voiceMinUsers: number;
  voiceIgnoreAfk: boolean;
  voiceIgnoreMuted: boolean;
  voiceIgnoreDeafened: boolean;
  multipliers: XpMultiplier[];
  ignoredChannelIds: string[];
  ignoredRoleIds: string[];
  rewards: LevelReward[];
  curveMode: CurveMode;
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
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function snowflake(id: unknown): string {
  const s = String(id || '').trim();
  if (!s) return '';
  if (!/^\d{5,32}$/.test(s)) return '';
  return s;
}

function hexColor(raw: unknown, fallback: string): string {
  const s = String(raw || '');
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}

export function defaultLevelingSettings(): LevelingSettings {
  return {
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
}

function normalizeMultiplier(raw: any, index: number): XpMultiplier | null {
  const targetType: MultiplierTarget =
    raw?.targetType === 'channel' || raw?.targetType === 'user'
      ? raw.targetType
      : 'role';
  const targetId = snowflake(raw?.targetId);
  const multiplier = Number(raw?.multiplier);
  if (!targetId) return null;
  if (!Number.isFinite(multiplier) || multiplier < 0.1 || multiplier > 10) {
    return null;
  }
  return {
    id: String(raw?.id || `m_${index}_${randomUUID().slice(0, 8)}`),
    targetType,
    targetId,
    multiplier: Math.round(multiplier * 100) / 100,
    enabled: raw?.enabled !== false,
  };
}

function normalizeReward(raw: any, index: number): LevelReward | null {
  const level = Math.round(Number(raw?.level));
  if (!Number.isFinite(level) || level < 1 || level > 10000) return null;
  const type: RewardType = raw?.type === 'message' ? 'message' : 'role';
  const value =
    type === 'role'
      ? snowflake(raw?.value)
      : String(raw?.value || '').slice(0, 500);
  if (!value) return null;
  return {
    id: String(raw?.id || `r_${index}_${randomUUID().slice(0, 8)}`),
    level,
    type,
    value,
    description: String(raw?.description || '').slice(0, 200),
    enabled: raw?.enabled !== false,
  };
}

export function normalizeLevelingSettings(
  raw: Record<string, unknown> | null | undefined,
): LevelingSettings {
  const base = defaultLevelingSettings();
  const src = raw && typeof raw === 'object' ? (raw as any) : {};

  // Legacy single xpPerMessage → range
  let xpMin = Number(src.xpMin ?? src.xpPerMessage ?? base.xpMin);
  let xpMax = Number(src.xpMax ?? src.xpPerMessage ?? base.xpMax);
  if (!Number.isFinite(xpMin)) xpMin = base.xpMin;
  if (!Number.isFinite(xpMax)) xpMax = base.xpMax;
  xpMin = clamp(Math.round(xpMin), 1, 500);
  xpMax = clamp(Math.round(xpMax), 1, 500);
  if (xpMin > xpMax) {
    const t = xpMin;
    xpMin = xpMax;
    xpMax = t;
  }

  const levelUpModeRaw = String(src.levelUpMode || '');
  let levelUpMode: LevelUpMode =
    levelUpModeRaw === 'disabled' ||
    levelUpModeRaw === 'current' ||
    levelUpModeRaw === 'channel'
      ? levelUpModeRaw
      : src.channelId
        ? 'channel'
        : base.levelUpMode;

  const curveModeRaw = String(src.curveMode || '');
  const curveMode: CurveMode =
    curveModeRaw === 'linear' ||
    curveModeRaw === 'progressive' ||
    curveModeRaw === 'custom'
      ? curveModeRaw
      : base.curveMode;

  const multipliers = Array.isArray(src.multipliers)
    ? src.multipliers
        .slice(0, 100)
        .map(normalizeMultiplier)
        .filter(Boolean)
    : [];

  const rewards = Array.isArray(src.rewards)
    ? src.rewards.slice(0, 200).map(normalizeReward).filter(Boolean)
    : [];

  const customCurve = Array.isArray(src.customCurve)
    ? src.customCurve
        .slice(0, 200)
        .map((row: any) => ({
          level: clamp(Math.round(Number(row?.level) || 0), 1, 10000),
          xp: clamp(Math.round(Number(row?.xp) || 0), 1, 10_000_000),
        }))
        .filter((row: { level: number; xp: number }) => row.level >= 1)
        .sort(
          (a: { level: number }, b: { level: number }) => a.level - b.level,
        )
    : [];

  const rank = src.rankCard && typeof src.rankCard === 'object' ? src.rankCard : {};
  const lb =
    src.leaderboard && typeof src.leaderboard === 'object' ? src.leaderboard : {};
  const spam =
    src.antiSpam && typeof src.antiSpam === 'object' ? src.antiSpam : {};

  return {
    enabled: Boolean(src.enabled),
    xpMin,
    xpMax,
    cooldownSeconds: clamp(
      Math.round(Number(src.cooldownSeconds ?? base.cooldownSeconds)),
      0,
      3600,
    ),
    levelUpMode,
    channelId: snowflake(src.channelId) || '',
    levelUpMessage: String(
      src.levelUpMessage || base.levelUpMessage,
    ).slice(0, 1000),
    voiceXpEnabled: Boolean(src.voiceXpEnabled),
    voiceXpPerMinute: clamp(
      Math.round(Number(src.voiceXpPerMinute ?? base.voiceXpPerMinute)),
      0,
      100,
    ),
    voiceMinUsers: clamp(
      Math.round(Number(src.voiceMinUsers ?? base.voiceMinUsers)),
      1,
      99,
    ),
    voiceIgnoreAfk: src.voiceIgnoreAfk !== false,
    voiceIgnoreMuted: src.voiceIgnoreMuted !== false,
    voiceIgnoreDeafened: src.voiceIgnoreDeafened !== false,
    multipliers: multipliers as XpMultiplier[],
    ignoredChannelIds: Array.isArray(src.ignoredChannelIds)
      ? (Array.from(
          new Set(
            (src.ignoredChannelIds as unknown[])
              .map(snowflake)
              .filter((id): id is string => id.length > 0),
          ),
        ) as string[]).slice(0, 100)
      : [],
    ignoredRoleIds: Array.isArray(src.ignoredRoleIds)
      ? (Array.from(
          new Set(
            (src.ignoredRoleIds as unknown[])
              .map(snowflake)
              .filter((id): id is string => id.length > 0),
          ),
        ) as string[]).slice(0, 100)
      : [],
    rewards: rewards as LevelReward[],
    curveMode,
    curveBaseXp: clamp(
      Math.round(Number(src.curveBaseXp ?? base.curveBaseXp)),
      10,
      100000,
    ),
    curveGrowth: clamp(
      Number(src.curveGrowth ?? base.curveGrowth),
      1,
      5,
    ),
    customCurve,
    removePreviousLevelRoles: Boolean(src.removePreviousLevelRoles),
    keepPreviousRoles: src.keepPreviousRoles !== false,
    rankCard: {
      enabled: rank.enabled !== false,
      backgroundColor: hexColor(rank.backgroundColor, base.rankCard.backgroundColor),
      accentColor: hexColor(rank.accentColor, base.rankCard.accentColor),
      textColor: hexColor(rank.textColor, base.rankCard.textColor),
      progressColor: hexColor(rank.progressColor, base.rankCard.progressColor),
      backgroundOpacity: clamp(
        Math.round(Number(rank.backgroundOpacity ?? 100)),
        0,
        100,
      ),
      showAvatar: rank.showAvatar !== false,
      showUsername: rank.showUsername !== false,
      showLevel: rank.showLevel !== false,
      showXp: rank.showXp !== false,
      showRank: rank.showRank !== false,
    },
    leaderboard: {
      enabled: lb.enabled !== false,
      isPublic: lb.isPublic !== false,
      sortBy: lb.sortBy === 'level' ? 'level' : 'xp',
      displayCount: clamp(
        Math.round(Number(lb.displayCount ?? base.leaderboard.displayCount)),
        3,
        25,
      ),
      excludedUserIds: Array.isArray(lb.excludedUserIds)
        ? (Array.from(
            new Set(
              (lb.excludedUserIds as unknown[])
                .map(snowflake)
                .filter((id): id is string => id.length > 0),
            ),
          ) as string[]).slice(0, 50)
        : [],
      excludedRoleIds: Array.isArray(lb.excludedRoleIds)
        ? (Array.from(
            new Set(
              (lb.excludedRoleIds as unknown[])
                .map(snowflake)
                .filter((id): id is string => id.length > 0),
            ),
          ) as string[]).slice(0, 50)
        : [],
    },
    antiSpam: {
      duplicateMessageProtection: spam.duplicateMessageProtection !== false,
      minMessageLength: clamp(
        Math.round(
          Number(spam.minMessageLength ?? base.antiSpam.minMessageLength),
        ),
        0,
        500,
      ),
      ignoreBots: spam.ignoreBots !== false,
      ignoreWebhooks: spam.ignoreWebhooks !== false,
    },
  };
}

export function validateLevelingPatch(next: LevelingSettings) {
  if (next.xpMin > next.xpMax) {
    throw new BadRequestException('xpMin cannot exceed xpMax');
  }
  if (next.levelUpMode === 'channel' && !next.channelId) {
    // allow empty — bot simply skips notification until configured
  }
  const rewardKeys = new Set<string>();
  for (const r of next.rewards) {
    const key = `${r.level}:${r.type}:${r.value}`;
    if (rewardKeys.has(key)) {
      throw new BadRequestException(
        `Duplicate reward for level ${r.level} (${r.type})`,
      );
    }
    rewardKeys.add(key);
  }
}

/** XP required to go from (level) → (level+1). Level is 0-based progress. */
export function xpForNextLevel(
  level: number,
  settings: Pick<
    LevelingSettings,
    'curveMode' | 'curveBaseXp' | 'curveGrowth' | 'customCurve'
  >,
): number {
  const lvl = Math.max(0, Math.floor(level));
  if (settings.curveMode === 'custom' && settings.customCurve?.length) {
    const row = settings.customCurve.find((c) => c.level === lvl + 1);
    if (row) return Math.max(1, row.xp);
  }
  if (settings.curveMode === 'linear') {
    return Math.max(1, Math.round(settings.curveBaseXp));
  }
  // progressive
  return Math.max(
    1,
    Math.round(settings.curveBaseXp * Math.pow(settings.curveGrowth, lvl)),
  );
}

export function previewCurve(
  settings: Pick<
    LevelingSettings,
    'curveMode' | 'curveBaseXp' | 'curveGrowth' | 'customCurve'
  >,
  maxLevel = 20,
): Array<{ level: number; xpToNext: number; cumulativeXp: number }> {
  const out: Array<{ level: number; xpToNext: number; cumulativeXp: number }> =
    [];
  let cumulative = 0;
  for (let level = 0; level < maxLevel; level += 1) {
    const xpToNext = xpForNextLevel(level, settings);
    cumulative += xpToNext;
    out.push({ level: level + 1, xpToNext, cumulativeXp: cumulative });
  }
  return out;
}
