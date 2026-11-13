/**
 * System bot leveling engine (sys_leveling + guild_member_xp).
 * Guild-scoped XP with Redis cooldown cache + batched Prisma writes.
 */
const featureDb = require('./featureDb');

/** @type {Map<string, { xp: number, level: number, dirty: boolean, lastMessageAt?: number, lastVoiceAt?: number }>} */
const memXp = new Map();
/** @type {Map<string, number>} */
const cooldownUntil = new Map();
/** @type {Map<string, string>} */
const lastContent = new Map();
/** @type {Map<string, number>} */
const voiceJoinedAt = new Map();

let flushTimer = null;
let redis = null;
let redisTried = false;

function getRedis() {
  if (redisTried) return redis;
  redisTried = true;
  try {
    const { getRedisConnection } = require('@maker/queue');
    redis = getRedisConnection();
  } catch {
    redis = null;
  }
  return redis;
}

function xpKey(botId, guildId, userId) {
  return `${botId}:${guildId}:${userId}`;
}

function cdKey(botId, guildId, userId) {
  return `lvl:cd:${botId}:${guildId}:${userId}`;
}

function voiceKey(botId, guildId, userId) {
  return `${botId}:${guildId}:${userId}`;
}

function defaultSettings() {
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
    rankCard: { enabled: true },
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

function normalizeSettings(raw) {
  const base = defaultSettings();
  const src = raw && typeof raw === 'object' ? raw : {};
  let xpMin = Number(src.xpMin ?? src.xpPerMessage ?? base.xpMin);
  let xpMax = Number(src.xpMax ?? src.xpPerMessage ?? base.xpMax);
  if (!Number.isFinite(xpMin)) xpMin = base.xpMin;
  if (!Number.isFinite(xpMax)) xpMax = base.xpMax;
  xpMin = Math.min(500, Math.max(1, Math.round(xpMin)));
  xpMax = Math.min(500, Math.max(1, Math.round(xpMax)));
  if (xpMin > xpMax) {
    const t = xpMin;
    xpMin = xpMax;
    xpMax = t;
  }
  const mode = String(src.levelUpMode || '');
  return {
    ...base,
    ...src,
    enabled: Boolean(src.enabled),
    xpMin,
    xpMax,
    cooldownSeconds: Math.min(
      3600,
      Math.max(0, Math.round(Number(src.cooldownSeconds ?? 60))),
    ),
    levelUpMode:
      mode === 'disabled' || mode === 'current' || mode === 'channel'
        ? mode
        : src.channelId
          ? 'channel'
          : 'channel',
    channelId: String(src.channelId || ''),
    levelUpMessage: String(src.levelUpMessage || base.levelUpMessage),
    voiceXpEnabled: Boolean(src.voiceXpEnabled),
    voiceXpPerMinute: Math.min(
      100,
      Math.max(0, Math.round(Number(src.voiceXpPerMinute ?? 5))),
    ),
    voiceMinUsers: Math.min(
      99,
      Math.max(1, Math.round(Number(src.voiceMinUsers ?? 2))),
    ),
    voiceIgnoreAfk: src.voiceIgnoreAfk !== false,
    voiceIgnoreMuted: src.voiceIgnoreMuted !== false,
    voiceIgnoreDeafened: src.voiceIgnoreDeafened !== false,
    multipliers: Array.isArray(src.multipliers) ? src.multipliers : [],
    ignoredChannelIds: Array.isArray(src.ignoredChannelIds)
      ? src.ignoredChannelIds.map(String)
      : [],
    ignoredRoleIds: Array.isArray(src.ignoredRoleIds)
      ? src.ignoredRoleIds.map(String)
      : [],
    rewards: Array.isArray(src.rewards) ? src.rewards : [],
    curveMode: ['linear', 'progressive', 'custom'].includes(src.curveMode)
      ? src.curveMode
      : 'progressive',
    curveBaseXp: Math.max(10, Math.round(Number(src.curveBaseXp ?? 100))),
    curveGrowth: Math.min(5, Math.max(1, Number(src.curveGrowth ?? 1.45))),
    customCurve: Array.isArray(src.customCurve) ? src.customCurve : [],
    removePreviousLevelRoles: Boolean(src.removePreviousLevelRoles),
    keepPreviousRoles: src.keepPreviousRoles !== false,
    rankCard: { ...base.rankCard, ...(src.rankCard || {}) },
    leaderboard: { ...base.leaderboard, ...(src.leaderboard || {}) },
    antiSpam: { ...base.antiSpam, ...(src.antiSpam || {}) },
  };
}

async function loadSettings(botId) {
  const id = String(botId);
  try {
    const { prisma } = require('@maker/database');
    const row = await prisma.featureRecord.findUnique({
      where: {
        namespace_key: { namespace: 'sys_leveling', key: id },
      },
    });
    if (row?.value && typeof row.value === 'object') {
      try {
        const cache = require('../../src/shared/services/featureCache');
        if (typeof cache.prime === 'function') {
          cache.prime('sys_leveling', id, row.value);
        }
      } catch {
        /* optional */
      }
      return normalizeSettings(row.value);
    }
  } catch (err) {
    console.warn(`[leveling] prisma settings: ${err.message}`);
  }
  return normalizeSettings(featureDb('sys_leveling').get(id) || null);
}

function xpForNextLevel(level, settings) {
  const lvl = Math.max(0, Math.floor(level));
  if (settings.curveMode === 'custom' && settings.customCurve?.length) {
    const row = settings.customCurve.find((c) => Number(c.level) === lvl + 1);
    if (row) return Math.max(1, Math.round(Number(row.xp)));
  }
  if (settings.curveMode === 'linear') {
    return Math.max(1, Math.round(settings.curveBaseXp));
  }
  return Math.max(
    1,
    Math.round(settings.curveBaseXp * Math.pow(settings.curveGrowth, lvl)),
  );
}

function levelFromXp(xp, settings) {
  let remaining = Math.max(0, Math.floor(xp));
  let level = 0;
  while (level < 10000) {
    const need = xpForNextLevel(level, settings);
    if (remaining < need) break;
    remaining -= need;
    level += 1;
  }
  return level;
}

function progressInLevel(xp, settings) {
  let remaining = Math.max(0, Math.floor(xp));
  let level = 0;
  while (level < 10000) {
    const need = xpForNextLevel(level, settings);
    if (remaining < need) return { level, progressXp: remaining, xpToNext: need };
    remaining -= need;
    level += 1;
  }
  const need = xpForNextLevel(level, settings);
  return { level, progressXp: remaining, xpToNext: need };
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushDirty();
  }, 2500);
}

async function flushDirty() {
  const dirty = [];
  for (const [key, row] of memXp.entries()) {
    if (row.dirty) dirty.push([key, row]);
  }
  if (!dirty.length) return;
  let prisma;
  try {
    ({ prisma } = require('@maker/database'));
  } catch (err) {
    console.warn(`[leveling] flush prisma: ${err.message}`);
    return;
  }
  for (const [key, row] of dirty) {
    const [botClientId, guildId, userId] = key.split(':');
    try {
      await prisma.guildMemberXp.upsert({
        where: {
          botClientId_guildId_userId: { botClientId, guildId, userId },
        },
        create: {
          botClientId,
          guildId,
          userId,
          xp: BigInt(Math.max(0, Math.floor(Number(row.xp) || 0))),
          level: Math.max(0, Math.floor(Number(row.level) || 0)),
          lastMessageAt: row.lastMessageAt
            ? new Date(row.lastMessageAt)
            : null,
          lastVoiceAt: row.lastVoiceAt ? new Date(row.lastVoiceAt) : null,
        },
        update: {
          xp: BigInt(Math.max(0, Math.floor(Number(row.xp) || 0))),
          level: Math.max(0, Math.floor(Number(row.level) || 0)),
          lastMessageAt: row.lastMessageAt
            ? new Date(row.lastMessageAt)
            : undefined,
          lastVoiceAt: row.lastVoiceAt ? new Date(row.lastVoiceAt) : undefined,
        },
      });
      row.dirty = false;
    } catch (err) {
      console.warn(`[leveling] upsert ${key}: ${err.message}`);
    }
  }
}

async function getMemberState(botId, guildId, userId) {
  const key = xpKey(botId, guildId, userId);
  if (memXp.has(key)) return memXp.get(key);
  let row = { xp: 0, level: 0, dirty: false };
  try {
    const { prisma } = require('@maker/database');
    const dbRow = await prisma.guildMemberXp.findUnique({
      where: {
        botClientId_guildId_userId: {
          botClientId: String(botId),
          guildId: String(guildId),
          userId: String(userId),
        },
      },
    });
    if (dbRow) {
      row = {
        xp: Number(dbRow.xp ?? 0),
        level: Number(dbRow.level ?? 0),
        dirty: false,
        lastMessageAt: dbRow.lastMessageAt?.getTime?.(),
        lastVoiceAt: dbRow.lastVoiceAt?.getTime?.(),
      };
    }
  } catch (err) {
    console.warn(`[leveling] load member: ${err.message}`);
  }
  memXp.set(key, row);
  return row;
}

async function isOnCooldown(botId, guildId, userId, cooldownSeconds) {
  if (!cooldownSeconds) return false;
  const key = cdKey(botId, guildId, userId);
  const now = Date.now();
  const local = cooldownUntil.get(key);
  if (local && local > now) return true;
  const r = getRedis();
  if (r) {
    try {
      const exists = await r.get(key);
      if (exists) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

async function setCooldown(botId, guildId, userId, cooldownSeconds) {
  if (!cooldownSeconds) return;
  const key = cdKey(botId, guildId, userId);
  const until = Date.now() + cooldownSeconds * 1000;
  cooldownUntil.set(key, until);
  const r = getRedis();
  if (r) {
    try {
      await r.set(key, '1', 'EX', Math.max(1, cooldownSeconds));
    } catch {
      /* ignore */
    }
  }
}

function computeMultiplier(settings, member, channelId) {
  let mult = 1;
  const rules = Array.isArray(settings.multipliers) ? settings.multipliers : [];
  for (const rule of rules) {
    if (!rule || rule.enabled === false) continue;
    const m = Number(rule.multiplier);
    if (!Number.isFinite(m) || m <= 0) continue;
    if (rule.targetType === 'channel' && String(rule.targetId) === String(channelId)) {
      mult = Math.max(mult, m);
    } else if (
      rule.targetType === 'role' &&
      member?.roles?.cache?.has(String(rule.targetId))
    ) {
      mult = Math.max(mult, m);
    } else if (
      rule.targetType === 'user' &&
      String(rule.targetId) === String(member?.id)
    ) {
      mult = Math.max(mult, m);
    }
  }
  return mult;
}

function fillLevelUpMessage(template, ctx) {
  return String(template || '')
    .replace(/\{user\}/gi, ctx.mention || '')
    .replace(/\{username\}/gi, ctx.username || '')
    .replace(/\{level\}/gi, String(ctx.level ?? ''))
    .replace(/\{xp\}/gi, String(ctx.xp ?? ''))
    .replace(/\{server\}/gi, ctx.server || '');
}

async function applyLevelRewards(member, fromLevel, toLevel, settings) {
  if (!member || toLevel <= fromLevel) return;
  const rewards = (settings.rewards || []).filter(
    (r) =>
      r &&
      r.enabled !== false &&
      r.type === 'role' &&
      Number(r.level) > fromLevel &&
      Number(r.level) <= toLevel,
  );
  if (!rewards.length && !settings.removePreviousLevelRoles) return;

  const me =
    member.guild.members.me ||
    (await member.guild.members.fetchMe().catch(() => null));
  const myHighest = me?.roles?.highest?.position ?? 0;

  const roleRewards = (settings.rewards || []).filter(
    (r) => r && r.enabled !== false && r.type === 'role' && r.value,
  );

  if (settings.removePreviousLevelRoles && !settings.keepPreviousRoles) {
    const keepIds = new Set(
      roleRewards
        .filter((r) => Number(r.level) <= toLevel)
        .sort((a, b) => Number(b.level) - Number(a.level))
        .slice(0, 1)
        .map((r) => String(r.value)),
    );
    const removeIds = roleRewards
      .map((r) => String(r.value))
      .filter((id) => !keepIds.has(id) && member.roles.cache.has(id));
    if (removeIds.length) {
      await member.roles
        .remove(removeIds, 'Leveling: remove previous level roles')
        .catch(() => {});
    }
  }

  for (const reward of rewards) {
    const roleId = String(reward.value);
    if (member.roles.cache.has(roleId)) continue;
    const role =
      member.guild.roles.cache.get(roleId) ||
      (await member.guild.roles.fetch(roleId).catch(() => null));
    if (!role || role.managed) continue;
    if (role.position >= myHighest) continue;
    await member.roles.add(roleId, `Leveling reward L${reward.level}`).catch(() => {});
  }

  for (const reward of (settings.rewards || []).filter(
    (r) =>
      r &&
      r.enabled !== false &&
      r.type === 'message' &&
      Number(r.level) > fromLevel &&
      Number(r.level) <= toLevel,
  )) {
    // message rewards are informational; notify via level-up channel if present
    void reward;
  }
}

async function sendLevelUp(messageOrChannel, member, settings, state) {
  if (settings.levelUpMode === 'disabled') return;
  const text = fillLevelUpMessage(settings.levelUpMessage, {
    mention: `<@${member.id}>`,
    username: member.user?.username || member.displayName || '',
    level: state.level,
    xp: state.xp,
    server: member.guild?.name || '',
  });
  if (!text) return;

  try {
    if (settings.levelUpMode === 'current' && messageOrChannel?.channel?.send) {
      await messageOrChannel.channel.send({ content: text });
      return;
    }
    const channelId = String(settings.channelId || '');
    if (!channelId) return;
    const ch =
      member.guild.channels.cache.get(channelId) ||
      (await member.guild.channels.fetch(channelId).catch(() => null));
    if (ch?.send) await ch.send({ content: text });
  } catch (err) {
    console.warn(`[leveling] level-up notify: ${err.message}`);
  }
}

async function awardXp(opts) {
  const {
    botId,
    guildId,
    userId,
    member,
    amount,
    source,
    message,
    settings,
  } = opts;
  if (!amount || amount <= 0) return null;
  const state = await getMemberState(botId, guildId, userId);
  const oldLevel = state.level;
  state.xp += Math.round(amount);
  state.level = levelFromXp(state.xp, settings);
  state.dirty = true;
  if (source === 'message') state.lastMessageAt = Date.now();
  if (source === 'voice') state.lastVoiceAt = Date.now();
  scheduleFlush();

  if (state.level > oldLevel) {
    await applyLevelRewards(member, oldLevel, state.level, settings);
    if (message) await sendLevelUp(message, member, settings, state);
    else await sendLevelUp(null, member, settings, state);
  }
  return state;
}

/**
 * Handle a guild message for XP.
 */
async function handleMessageXp(client, message) {
  if (!client?.user?.id || !message?.guild || !message.member) return;
  const author = message.author;
  if (!author) return;

  const settings = await loadSettings(client.user.id);
  if (!settings.enabled) return;

  const spam = settings.antiSpam || {};
  if (spam.ignoreBots !== false && author.bot) return;
  if (spam.ignoreWebhooks !== false && message.webhookId) return;

  const content = String(message.content || '').trim();
  const minLen = Number(spam.minMessageLength ?? 2);
  if (content.length < minLen && !(message.attachments?.size > 0)) return;

  if (settings.ignoredChannelIds.includes(String(message.channelId))) return;
  if (
    settings.ignoredRoleIds.some((id) => message.member.roles.cache.has(id))
  ) {
    return;
  }

  const botId = client.user.id;
  const guildId = message.guild.id;
  const userId = author.id;

  if (await isOnCooldown(botId, guildId, userId, settings.cooldownSeconds)) {
    return;
  }

  if (spam.duplicateMessageProtection !== false && content) {
    const lk = `${botId}:${guildId}:${userId}`;
    if (lastContent.get(lk) === content) return;
    lastContent.set(lk, content);
  }

  const base =
    settings.xpMin === settings.xpMax
      ? settings.xpMin
      : Math.floor(
          Math.random() * (settings.xpMax - settings.xpMin + 1) + settings.xpMin,
        );
  const mult = computeMultiplier(settings, message.member, message.channelId);
  const amount = Math.max(1, Math.round(base * mult));

  await setCooldown(botId, guildId, userId, settings.cooldownSeconds);
  await awardXp({
    botId,
    guildId,
    userId,
    member: message.member,
    amount,
    source: 'message',
    message,
    settings,
  });
}

function countableVoiceMembers(channel, settings) {
  if (!channel?.members) return 0;
  let n = 0;
  for (const m of channel.members.values()) {
    if (m.user?.bot) continue;
    if (settings.voiceIgnoreMuted && (m.voice?.selfMute || m.voice?.serverMute)) {
      continue;
    }
    if (
      settings.voiceIgnoreDeafened &&
      (m.voice?.selfDeaf || m.voice?.serverDeaf)
    ) {
      continue;
    }
    n += 1;
  }
  return n;
}

async function settleVoiceXp(client, guild, userId, member, settings) {
  if (!settings.voiceXpEnabled) return;
  const key = voiceKey(client.user.id, guild.id, userId);
  const started = voiceJoinedAt.get(key);
  if (!started) return;
  voiceJoinedAt.delete(key);
  const minutes = Math.floor((Date.now() - started) / 60000);
  if (minutes < 1) return;
  const amount = minutes * Math.max(0, settings.voiceXpPerMinute);
  if (amount <= 0) return;
  if (settings.ignoredRoleIds.some((id) => member?.roles?.cache?.has(id))) {
    return;
  }
  await awardXp({
    botId: client.user.id,
    guildId: guild.id,
    userId,
    member,
    amount,
    source: 'voice',
    message: null,
    settings,
  });
}

/**
 * Track voice join/leave for Voice XP.
 */
async function handleVoiceXp(client, oldState, newState) {
  if (!client?.user?.id) return;
  const settings = await loadSettings(client.user.id);
  if (!settings.enabled || !settings.voiceXpEnabled) return;

  const guild = newState.guild || oldState.guild;
  if (!guild) return;
  const userId = newState.id || oldState.id;
  const member = newState.member || oldState.member;
  if (!member || member.user?.bot) return;

  const joined = !oldState.channelId && newState.channelId;
  const left = oldState.channelId && !newState.channelId;
  const switched =
    oldState.channelId &&
    newState.channelId &&
    oldState.channelId !== newState.channelId;

  if (joined || switched) {
    const channel = newState.channel;
    if (!channel) return;
    if (
      settings.voiceIgnoreAfk &&
      guild.afkChannelId &&
      channel.id === guild.afkChannelId
    ) {
      return;
    }
    if (settings.ignoredChannelIds.includes(String(channel.id))) return;
    if (countableVoiceMembers(channel, settings) < settings.voiceMinUsers) {
      return;
    }
    if (settings.voiceIgnoreMuted && (newState.selfMute || newState.serverMute)) {
      return;
    }
    if (
      settings.voiceIgnoreDeafened &&
      (newState.selfDeaf || newState.serverDeaf)
    ) {
      return;
    }
    if (switched) {
      await settleVoiceXp(client, guild, userId, member, settings);
    }
    voiceJoinedAt.set(voiceKey(client.user.id, guild.id, userId), Date.now());
  }

  if (left) {
    await settleVoiceXp(client, guild, userId, member, settings);
  }
}

async function getRank(botId, guildId, userId, settings) {
  const state = await getMemberState(botId, guildId, userId);
  const prog = progressInLevel(state.xp, settings);
  let rank = 1;
  try {
    const { prisma } = require('@maker/database');
    const higher = await prisma.guildMemberXp.count({
      where: {
        botClientId: String(botId),
        guildId: String(guildId),
        xp: { gt: state.xp },
      },
    });
    rank = higher + 1;
  } catch {
    /* ignore */
  }
  return {
    xp: state.xp,
    level: prog.level,
    progressXp: prog.progressXp,
    xpToNext: prog.xpToNext,
    rank,
  };
}

async function getLeaderboard(botId, guildId, settings) {
  const take = Math.min(25, Math.max(3, Number(settings.leaderboard?.displayCount) || 10));
  const excluded = new Set(settings.leaderboard?.excludedUserIds || []);
  const orderBy =
    settings.leaderboard?.sortBy === 'level'
      ? [{ level: 'desc' }, { xp: 'desc' }]
      : [{ xp: 'desc' }, { level: 'desc' }];
  try {
    const { prisma } = require('@maker/database');
    const rows = await prisma.guildMemberXp.findMany({
      where: {
        botClientId: String(botId),
        guildId: String(guildId),
        ...(excluded.size ? { userId: { notIn: [...excluded] } } : {}),
      },
      orderBy,
      take,
    });
    return rows.map((r, i) => ({
      userId: r.userId,
      xp: r.xp,
      level: r.level,
      rank: i + 1,
    }));
  } catch (err) {
    console.warn(`[leveling] leaderboard: ${err.message}`);
    return [];
  }
}

module.exports = {
  loadSettings,
  handleMessageXp,
  handleVoiceXp,
  getRank,
  getLeaderboard,
  progressInLevel,
  xpForNextLevel,
  flushDirty,
  fillLevelUpMessage,
};
