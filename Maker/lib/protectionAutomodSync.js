/**
 * Sync dashboard automod settings → Discord native AutoModeration rules.
 * Rules are tagged with "[Maker Protection]" so we only manage our own.
 */
const {
  AutoModerationRuleTriggerType,
  AutoModerationRuleEventType,
  AutoModerationActionType,
  AutoModerationRuleKeywordPresetType,
  PermissionFlagsBits,
} = require('discord.js');
const protectiondb = require('./featureDb')('protection');

const RULE_PREFIX = '[Maker Protection]';
const SYNC_INTERVAL_MS = 3 * 60 * 1000;

const lastHashByGuild = new Map(); // `${guildId}:${botId}` -> hash
const timers = new Map();

function getConfig(guildId, botId) {
  const raw = protectiondb.get(`protectionConfig_${guildId}_${botId}`) || null;
  return raw && typeof raw === 'object' ? raw : {};
}

function saveConfig(guildId, botId, cfg) {
  protectiondb.set(`protectionConfig_${guildId}_${botId}`, cfg);
}

function hashAutomod(am) {
  if (!am) return 'off';
  return JSON.stringify({
    enabled: Boolean(am.enabled),
    alertChannelId: String(am.alertChannelId || ''),
    blockInvites: am.blockInvites !== false,
    blockLinks: Boolean(am.blockLinks),
    mentionSpamLimit: Number(am.mentionSpamLimit || 0),
    keywordPresets: Array.isArray(am.keywordPresets)
      ? [...am.keywordPresets].sort()
      : [],
    customKeywords: Array.isArray(am.customKeywords)
      ? [...am.customKeywords].sort()
      : [],
    timeoutSeconds: Number(am.timeoutSeconds || 0),
  });
}

function mapPreset(name) {
  const n = String(name || '').toLowerCase();
  if (n === 'profanity') {
    return AutoModerationRuleKeywordPresetType.Profanity;
  }
  if (n === 'sexual_content' || n === 'sexualcontent') {
    return AutoModerationRuleKeywordPresetType.SexualContent;
  }
  if (n === 'slurs') {
    return AutoModerationRuleKeywordPresetType.Slurs;
  }
  return null;
}

function buildActions(am) {
  const actions = [
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { customMessage: 'Blocked by Maker Protection AutoMod' },
    },
  ];
  const alertId = String(am.alertChannelId || '').trim();
  if (alertId) {
    actions.push({
      type: AutoModerationActionType.SendAlertMessage,
      metadata: { channelId: alertId },
    });
  }
  const timeoutSec = Number(am.timeoutSeconds || 0);
  if (timeoutSec > 0) {
    actions.push({
      type: AutoModerationActionType.Timeout,
      metadata: {
        durationSeconds: Math.min(Math.max(timeoutSec, 1), 2419200),
      },
    });
  }
  return actions;
}

async function listMakerRules(guild) {
  const rules = await guild.autoModerationRules.fetch().catch(() => null);
  if (!rules) return [];
  return [...rules.values()].filter((r) =>
    String(r.name || '').startsWith(RULE_PREFIX),
  );
}

async function deleteMakerRules(guild) {
  const existing = await listMakerRules(guild);
  for (const rule of existing) {
    await rule.delete('Maker Protection AutoMod sync').catch(() => {});
  }
}

async function createRule(guild, name, data) {
  return guild.autoModerationRules.create({
    name: `${RULE_PREFIX} ${name}`,
    enabled: true,
    eventType: AutoModerationRuleEventType.MessageSend,
    ...data,
  });
}

async function writeSyncMeta(guildId, botId, patch) {
  const cfg = getConfig(guildId, botId);
  const automod = {
    ...(cfg.automod || {}),
    ...patch,
  };
  cfg.automod = automod;
  saveConfig(guildId, botId, cfg);
}

async function sendLog(guild, botId, text) {
  const cfg = getConfig(guild.id, botId);
  const logId =
    cfg.general?.logChannelId ||
    cfg.automod?.alertChannelId ||
    protectiondb.get(`protectionLog_${guild.id}_${botId}`) ||
    null;
  if (!logId) return;
  const channel =
    guild.channels.cache.get(logId) ||
    (await guild.channels.fetch(logId).catch(() => null));
  if (!channel || !channel.isTextBased?.()) return;
  await channel.send({ content: text }).catch(() => {});
}

/**
 * Sync AutoMod rules for one guild.
 * @returns {{ ok: boolean, error?: string, ruleIds?: string[] }}
 */
async function syncAutomodRules(guild, botId, opts = {}) {
  if (!guild?.id || !botId) return { ok: false, error: 'missing guild' };
  const force = Boolean(opts.force);
  const cfg = getConfig(guild.id, botId);
  const am = cfg.automod || {};
  const key = `${guild.id}:${botId}`;
  const hash = hashAutomod(am);
  if (!force && lastHashByGuild.get(key) === hash && am.enabled) {
    return { ok: true, ruleIds: am.syncedRuleIds || [] };
  }

  const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (!me?.permissions?.has?.(PermissionFlagsBits.ManageGuild)) {
    const error = 'Bot needs Manage Server to sync AutoMod rules';
    await writeSyncMeta(guild.id, botId, {
      lastSyncError: error,
    });
    await sendLog(guild, botId, `⚠️ AutoMod sync failed: ${error}`);
    return { ok: false, error };
  }

  try {
    await deleteMakerRules(guild);

    if (!am.enabled) {
      await writeSyncMeta(guild.id, botId, {
        syncedRuleIds: [],
        lastSyncError: '',
        lastSyncedAt: new Date().toISOString(),
      });
      lastHashByGuild.set(key, hash);
      return { ok: true, ruleIds: [] };
    }

    const actions = buildActions(am);
    const createdIds = [];

    if (am.blockInvites !== false) {
      const rule = await createRule(guild, 'Block Invites', {
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: {
          keywordFilter: [
            '*discord.gg*',
            '*discord.com/invite*',
            '*discordapp.com/invite*',
          ],
        },
        actions,
      });
      createdIds.push(rule.id);
    }

    if (am.blockLinks) {
      const rule = await createRule(guild, 'Block Links', {
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: {
          keywordFilter: ['*http://*', '*https://*', '*www.*'],
        },
        actions,
      });
      createdIds.push(rule.id);
    }

    const mentionLimit = Number(am.mentionSpamLimit || 0);
    if (mentionLimit > 0) {
      const rule = await createRule(guild, 'Mention Spam', {
        triggerType: AutoModerationRuleTriggerType.MentionSpam,
        triggerMetadata: {
          mentionTotalLimit: Math.min(Math.max(mentionLimit, 1), 50),
        },
        actions,
      });
      createdIds.push(rule.id);
    }

    const presets = (Array.isArray(am.keywordPresets) ? am.keywordPresets : [])
      .map(mapPreset)
      .filter((p) => p != null);
    if (presets.length) {
      const rule = await createRule(guild, 'Keyword Presets', {
        triggerType: AutoModerationRuleTriggerType.KeywordPreset,
        triggerMetadata: {
          presets,
        },
        actions,
      });
      createdIds.push(rule.id);
    }

    const customs = (
      Array.isArray(am.customKeywords) ? am.customKeywords : []
    )
      .map((k) => String(k).trim())
      .filter(Boolean)
      .slice(0, 40);
    if (customs.length) {
      const rule = await createRule(guild, 'Custom Keywords', {
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: {
          keywordFilter: customs,
        },
        actions,
      });
      createdIds.push(rule.id);
    }

    await writeSyncMeta(guild.id, botId, {
      syncedRuleIds: createdIds,
      lastSyncError: '',
      lastSyncedAt: new Date().toISOString(),
    });
    lastHashByGuild.set(key, hash);
    return { ok: true, ruleIds: createdIds };
  } catch (err) {
    const error = String(err?.message || err).slice(0, 300);
    console.warn(`[protection-automod] sync failed: ${error}`);
    await writeSyncMeta(guild.id, botId, { lastSyncError: error });
    await sendLog(guild, botId, `⚠️ AutoMod sync failed: ${error}`);
    return { ok: false, error };
  }
}

async function syncClientGuilds(client) {
  if (!client?.user?.id || !client.guilds?.cache) return;
  const botId = client.user.id;
  for (const guild of client.guilds.cache.values()) {
    await syncAutomodRules(guild, botId).catch((err) => {
      console.warn(
        `[protection-automod] guild ${guild.id}: ${err?.message || err}`,
      );
    });
  }
}

function startAutomodPoll(client) {
  if (!client?.user?.id) return;
  const botId = client.user.id;
  stopAutomodPoll(botId);
  const timer = setInterval(() => {
    void syncClientGuilds(client);
  }, SYNC_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  timers.set(botId, timer);
}

function stopAutomodPoll(botId) {
  const t = timers.get(String(botId));
  if (t) {
    clearInterval(t);
    timers.delete(String(botId));
  }
}

function attachAutomodSync(client) {
  if (!client || client.__makerAutomodAttached) return;
  client.__makerAutomodAttached = true;

  const run = () => {
    void syncClientGuilds(client).then(() => startAutomodPoll(client));
  };

  if (client.isReady?.()) run();
  else client.once('ready', run);

  client.on('guildCreate', (guild) => {
    void (async () => {
      try {
        const { leaveIfUnauthorized } = require('./guildLock');
        if (await leaveIfUnauthorized(client, guild)) return;
      } catch (_) {}
      void syncAutomodRules(guild, client.user.id, { force: true });
    })();
  });
}

module.exports = {
  syncAutomodRules,
  syncClientGuilds,
  attachAutomodSync,
  startAutomodPoll,
  stopAutomodPoll,
  RULE_PREFIX,
};
