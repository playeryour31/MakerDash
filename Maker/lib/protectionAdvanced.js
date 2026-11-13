/**
 * Advanced Protection systems driven by dashboard config
 * (`protectionConfig_{guildId}_{botId}` in FeatureRecord namespace "protection").
 * Complements legacy anti-nuke / anti-bots keys used by slash commands.
 */
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Database } = require('st.db');
const protectiondb = require('./featureDb')('protection');

const joinBuckets = new Map(); // `${guildId}:${botId}` -> number[]
const spamBuckets = new Map(); // `${guildId}:${userId}:${botId}` -> number[]

function hasProtectionCommands(client) {
  try {
    const commandsdb = new Database(
      `/Database/CommandsData/BotsCommands_${client.user.id}.json`,
    );
    const botCommands = commandsdb.get('commands_' + client.user.id) || [];
    return botCommands.some((c) => c.type === 'Protection');
  } catch {
    return false;
  }
}

function getConfig(guildId, botId) {
  const raw =
    protectiondb.get(`protectionConfig_${guildId}_${botId}`) || null;
  return raw && typeof raw === 'object' ? raw : {};
}

function isWhitelisted(guildId, userId, botId, action) {
  const cfg = getConfig(guildId, botId);
  const entries = cfg.whitelist?.entries;
  if (Array.isArray(entries)) {
    const hit = entries.find((e) => String(e.userId) === String(userId));
    if (hit) {
      const actions = Array.isArray(hit.actions) ? hit.actions.map(String) : [];
      if (actions.includes('all') || actions.includes(action) || !action) {
        return true;
      }
    }
  }
  const legacy =
    protectiondb.get(`whiteList_${guildId}_${userId}_${botId}`) || [];
  if (Array.isArray(legacy)) {
    return legacy.includes('all') || (action ? legacy.includes(action) : false);
  }
  return false;
}

async function notifyOwnerIfEnabled(guild, botId, description) {
  const cfg = getConfig(guild.id, botId);
  if (cfg.general?.notifyOwner === false) return;
  try {
    const owner =
      guild.members.cache.get(guild.ownerId) ||
      (await guild.fetchOwner().catch(() => null));
    if (!owner?.user) return;
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle(`Protection — ${guild.name}`)
      .setDescription(String(description).slice(0, 2000))
      .setTimestamp();
    await owner.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.warn(`[protection] notifyOwner failed: ${err?.message || err}`);
  }
}

function shouldNotifyOwner(guildId, botId) {
  const cfg = getConfig(guildId, botId);
  return cfg.general?.notifyOwner !== false;
}

async function sendProtectionLog(guild, botId, description, opts = {}) {
  const cfg = getConfig(guild.id, botId);
  const logId =
    cfg.general?.logChannelId ||
    protectiondb.get(`protectionLog_${guild.id}_${botId}`) ||
    null;
  if (logId) {
    const channel =
      guild.channels.cache.get(logId) ||
      (await guild.channels.fetch(logId).catch(() => null));
    if (channel && channel.isTextBased?.()) {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setDescription(description)
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
  if (opts.critical) {
    await notifyOwnerIfEnabled(guild, botId, description);
  }
}

async function applyPunishment(member, punishment, opts = {}) {
  if (!member) return;
  const reason = opts.reason || 'Protection system';
  try {
    switch (punishment) {
      case 'delete':
        if (opts.message) await opts.message.delete().catch(() => {});
        break;
      case 'timeout': {
        const ms = Math.min(
          Math.max(Number(opts.timeoutSeconds || 300) * 1000, 10_000),
          28 * 24 * 60 * 60 * 1000,
        );
        await member.timeout(ms, reason).catch(() => {});
        if (opts.message) await opts.message.delete().catch(() => {});
        break;
      }
      case 'kick':
        await member.kick(reason).catch(() => {});
        break;
      case 'ban':
        await member.ban({ reason, deleteMessageSeconds: 0 }).catch(() => {});
        break;
      case 'strip_roles': {
        const removable = member.roles.cache.filter(
          (r) => r.id !== member.guild.id && r.editable,
        );
        if (removable.size) {
          await member.roles.remove(removable, reason).catch(() => {});
        }
        break;
      }
      case 'quarantine': {
        const roleId = opts.quarantineRoleId;
        if (roleId) {
          await member.roles.add(roleId, reason).catch(() => {});
        } else {
          await member.kick(reason).catch(() => {});
        }
        break;
      }
      case 'lockdown':
        await activateLockdown(member.guild, member.client.user.id, reason);
        break;
      default:
        break;
    }
  } catch (err) {
    console.warn(`[protection] punish failed: ${err?.message || err}`);
  }
}

const lockdownMuteApplied = new Map(); // `${guildId}:${botId}` -> boolean

function lockdownKey(guildId, botId) {
  return `${guildId}:${botId}`;
}

async function muteEveryoneForLockdown(guild, reason) {
  const everyone = guild.roles.everyone;
  await everyone
    .setPermissions(
      everyone.permissions.remove([
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.CreatePrivateThreads,
        PermissionFlagsBits.SendMessagesInThreads,
      ]),
      reason,
    )
    .catch(() => {});
}

async function unmuteEveryoneAfterLockdown(guild, reason) {
  const everyone = guild.roles.everyone;
  await everyone
    .setPermissions(
      everyone.permissions.add([
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.CreatePrivateThreads,
        PermissionFlagsBits.SendMessagesInThreads,
      ]),
      reason,
    )
    .catch(() => {});
}

async function activateLockdown(guild, botId, reason) {
  const cfg = getConfig(guild.id, botId);
  const lockdown = {
    ...(cfg.lockdown || {}),
    enabled: true,
    active: true,
    reason: String(reason || cfg.lockdown?.reason || 'Emergency lockdown'),
  };
  cfg.lockdown = lockdown;
  protectiondb.set(`protectionConfig_${guild.id}_${botId}`, cfg);

  if (lockdown.muteEveryone !== false) {
    await muteEveryoneForLockdown(guild, lockdown.reason);
    lockdownMuteApplied.set(lockdownKey(guild.id, botId), true);
  }
  await sendProtectionLog(
    guild,
    botId,
    `🔒 Lockdown activated: ${lockdown.reason}`,
    { critical: true },
  );
}

async function deactivateLockdown(guild, botId, reason) {
  const cfg = getConfig(guild.id, botId);
  const lockdown = {
    ...(cfg.lockdown || {}),
    active: false,
    reason: String(reason || cfg.lockdown?.reason || 'Lockdown lifted'),
  };
  cfg.lockdown = lockdown;
  protectiondb.set(`protectionConfig_${guild.id}_${botId}`, cfg);

  const key = lockdownKey(guild.id, botId);
  if (lockdown.muteEveryone !== false || lockdownMuteApplied.get(key)) {
    await unmuteEveryoneAfterLockdown(guild, lockdown.reason);
    lockdownMuteApplied.set(key, false);
  }
  await sendProtectionLog(
    guild,
    botId,
    `🔓 Lockdown deactivated: ${lockdown.reason}`,
    { critical: true },
  );
}

/**
 * Sync Discord mute state with dashboard lockdown.active.
 * Called from poll + join handler so dashboard toggles take effect.
 */
async function syncLockdownState(guild, botId) {
  if (!guild?.id || !botId) return;
  const cfg = getConfig(guild.id, botId);
  const wantActive = Boolean(cfg.lockdown?.active);
  const key = lockdownKey(guild.id, botId);
  const applied = lockdownMuteApplied.get(key);

  if (wantActive && applied !== true) {
    if (cfg.lockdown?.muteEveryone !== false) {
      await muteEveryoneForLockdown(
        guild,
        cfg.lockdown?.reason || 'Dashboard lockdown',
      );
    }
    lockdownMuteApplied.set(key, true);
    await sendProtectionLog(
      guild,
      botId,
      `🔒 Lockdown synced from dashboard: ${cfg.lockdown?.reason || 'active'}`,
      { critical: true },
    );
  } else if (!wantActive && applied === true) {
    await unmuteEveryoneAfterLockdown(
      guild,
      cfg.lockdown?.reason || 'Dashboard lockdown lifted',
    );
    lockdownMuteApplied.set(key, false);
    await sendProtectionLog(
      guild,
      botId,
      `🔓 Lockdown lifted from dashboard`,
      { critical: true },
    );
  } else if (applied === undefined) {
    lockdownMuteApplied.set(key, wantActive && cfg.lockdown?.muteEveryone !== false);
  }
}

async function syncLockdownForClient(client) {
  if (!client?.user?.id || !client.guilds?.cache) return;
  const botId = client.user.id;
  for (const guild of client.guilds.cache.values()) {
    await syncLockdownState(guild, botId).catch((err) => {
      console.warn(
        `[protection-lockdown] sync ${guild.id}: ${err?.message || err}`,
      );
    });
  }
}

function attachLockdownPoll(client) {
  if (!client || client.__makerLockdownAttached) return;
  client.__makerLockdownAttached = true;
  const botId = client.user?.id;

  const run = () => {
    void syncLockdownForClient(client);
    if (!botId) return;
    const { getScheduler } = require('../../src/shared/runtime/scheduler');
    const scheduler = getScheduler();
    const scope = `bot:${botId}`;
    scheduler.stop('lockdown-sync', scope);
    scheduler.every(
      45 * 1000,
      () => {
        void syncLockdownForClient(client);
      },
      { name: 'lockdown-sync', scope },
    );
  };

  if (client.isReady?.()) run();
  else client.once('ready', run);
}

function stopLockdownPoll(botId) {
  const { getScheduler } = require('../../src/shared/runtime/scheduler');
  getScheduler().stop('lockdown-sync', `bot:${String(botId)}`);
}

function pushTimed(map, key, now, windowMs) {
  const arr = (map.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  map.set(key, arr);
  return arr.length;
}

async function handleMemberAdd(client, member) {
  if (!member?.guild || !client?.user?.id) return;
  if (!hasProtectionCommands(client)) return;
  const botId = client.user.id;
  const guildId = member.guild.id;

  // Keep mute state in sync with dashboard toggles
  await syncLockdownState(member.guild, botId).catch(() => {});
  const cfg = getConfig(guildId, botId);

  // Lockdown: block joins
  if (cfg.lockdown?.active && cfg.lockdown?.blockJoins) {
    await member
      .kick(cfg.lockdown.reason || 'Server lockdown')
      .catch(() => {});
    await sendProtectionLog(
      member.guild,
      botId,
      `Blocked join during lockdown: ${member.user.tag}`,
    );
    return;
  }

  // Join gate — account age
  const gate = cfg['join-gate'];
  if (gate?.enabled && !member.user.bot) {
    const minDays = Number(gate.minAccountAgeDays || 0);
    const ageMs = Date.now() - member.user.createdTimestamp;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (minDays > 0 && ageDays < minDays) {
      if (!isWhitelisted(guildId, member.id, botId, 'all')) {
        await applyPunishment(member, gate.punishment || 'kick', {
          reason: `Account younger than ${minDays} days`,
          quarantineRoleId: gate.quarantineRoleId,
        });
        await sendProtectionLog(
          member.guild,
          botId,
          `Join gate: ${member.user.tag} (age ${ageDays.toFixed(1)}d)`,
        );
        return;
      }
    }
  }

  // Anti-raid — mass joins
  const raid = cfg['anti-raid'];
  if (raid?.enabled && !member.user.bot) {
    const now = Date.now();
    const windowMs = Number(raid.windowSeconds || 12) * 1000;
    const key = `${guildId}:${botId}`;
    const count = pushTimed(joinBuckets, key, now, windowMs);
    if (count >= Number(raid.joinThreshold || 8)) {
      if (!isWhitelisted(guildId, member.id, botId, 'all')) {
        await applyPunishment(member, raid.punishment || 'kick', {
          reason: 'Anti-raid threshold',
          quarantineRoleId: cfg['join-gate']?.quarantineRoleId,
        });
        if (raid.alsoLockdown || raid.punishment === 'lockdown') {
          await activateLockdown(member.guild, botId, 'Anti-raid auto lockdown');
        }
        await sendProtectionLog(
          member.guild,
          botId,
          `Anti-raid triggered (${count} joins / ${raid.windowSeconds}s)`,
          { critical: true },
        );
      }
    }
  }
}

async function handleMessage(client, message) {
  if (!message?.guild || message.author?.bot || !client?.user?.id) return false;
  if (!hasProtectionCommands(client)) return false;
  const botId = client.user.id;
  const guildId = message.guild.id;
  const member = message.member;
  if (!member) return false;
  if (member.id === message.guild.ownerId) return false;
  if (member.permissions?.has?.(PermissionFlagsBits.Administrator)) return false;
  if (isWhitelisted(guildId, member.id, botId, 'all')) return false;

  const cfg = getConfig(guildId, botId);

  // Anti-spam
  const spam = cfg['anti-spam'];
  if (spam?.enabled) {
    const now = Date.now();
    const windowMs = Number(spam.windowSeconds || 5) * 1000;
    const key = `${guildId}:${member.id}:${botId}`;
    const count = pushTimed(spamBuckets, key, now, windowMs);
    const mentionCount =
      (message.mentions?.users?.size || 0) +
      (message.mentions?.roles?.size || 0);
    const everyone =
      spam.blockEveryone !== false &&
      (message.mentions?.everyone ||
        /(^|\s)@(everyone|here)\b/i.test(message.content || ''));
    const overMessages = count > Number(spam.maxMessages || 6);
    const overMentions = mentionCount > Number(spam.maxMentions || 5);
    if (overMessages || overMentions || everyone) {
      await applyPunishment(member, spam.punishment || 'timeout', {
        message,
        timeoutSeconds: spam.timeoutSeconds,
        reason: 'Anti-spam',
      });
      await sendProtectionLog(
        message.guild,
        botId,
        `Anti-spam: ${member.user.tag} (${spam.punishment || 'timeout'})`,
      );
      return true;
    }
  }

  // Anti-links / invites
  const links = cfg['anti-links'];
  if (links?.enabled) {
    const content = String(message.content || '');
    const exemptRole =
      Array.isArray(links.exemptRoleIds) &&
      links.exemptRoleIds.some((id) => member.roles.cache.has(id));
    const exemptChannel =
      Array.isArray(links.exemptChannelIds) &&
      links.exemptChannelIds.includes(message.channel.id);
    if (!exemptRole && !exemptChannel) {
      const inviteRe =
        /(discord\.gg\/|discord(?:app)?\.com\/invite\/)/i;
      const urlRe = /https?:\/\/[^\s]+/i;
      const allowed = Array.isArray(links.allowedDomains)
        ? links.allowedDomains.map((d) => String(d).toLowerCase())
        : [];
      let blocked = false;
      if (links.blockInvites !== false && inviteRe.test(content)) {
        blocked = true;
      } else if (links.blockLinks !== false && urlRe.test(content)) {
        const urls = content.match(/https?:\/\/[^\s]+/gi) || [];
        blocked = urls.some((u) => {
          try {
            const host = new URL(u).hostname.replace(/^www\./, '').toLowerCase();
            return !allowed.some(
              (d) => host === d || host.endsWith(`.${d}`),
            );
          } catch {
            return true;
          }
        });
      }
      if (blocked) {
        await applyPunishment(member, links.punishment || 'delete', {
          message,
          timeoutSeconds: 300,
          reason: 'Anti-links',
        });
        await sendProtectionLog(
          message.guild,
          botId,
          `Anti-links: ${member.user.tag}`,
        );
        return true;
      }
    }
  }

  return false;
}

async function handleWebhooksUpdate(client, channel) {
  if (!channel?.guild || !client?.user?.id) return;
  if (!hasProtectionCommands(client)) return;
  const botId = client.user.id;
  const cfg = getConfig(channel.guild.id, botId);
  const links = cfg['anti-links'];
  if (!links?.enabled || links.blockWebhooks === false) return;

  try {
    const logs = await channel.guild.fetchAuditLogs({
      type: 50, // WebhookCreate
      limit: 1,
    });
    const entry = logs.entries.first();
    if (!entry || Date.now() - entry.createdTimestamp > 15_000) return;
    const executor = entry.executor;
    if (!executor || executor.id === botId || executor.bot) return;
    if (executor.id === channel.guild.ownerId) return;
    if (isWhitelisted(channel.guild.id, executor.id, botId, 'all')) return;

    const member = await channel.guild.members.fetch(executor.id).catch(() => null);
    await applyPunishment(member, links.punishment || 'strip_roles', {
      reason: 'Anti-webhook',
    });
    // Try delete the webhook
    if (entry.target?.id) {
      const hooks = await channel.fetchWebhooks().catch(() => null);
      const hook = hooks?.get(entry.target.id);
      if (hook) await hook.delete('Anti-webhook').catch(() => {});
    }
    await sendProtectionLog(
      channel.guild,
      botId,
      `Anti-webhook: ${executor.tag || executor.id}`,
    );
  } catch (err) {
    console.warn(`[protection] webhooksUpdate: ${err?.message || err}`);
  }
}

async function handleDangerousUpdate(client, guildOrRole, kind) {
  const guild = guildOrRole.guild || guildOrRole;
  if (!guild?.id || !client?.user?.id) return;
  if (!hasProtectionCommands(client)) return;
  const botId = client.user.id;
  const cfg = getConfig(guild.id, botId);
  // Reuse anti-nuke enabled flag as dangerous updates master when config present
  const nuke = cfg['anti-nuke'];
  if (nuke && nuke.enabled === false) return;

  try {
    const type = kind === 'role' ? 31 : 1; // RoleUpdate : GuildUpdate
    const logs = await guild.fetchAuditLogs({ type, limit: 1 });
    const entry = logs.entries.first();
    if (!entry || Date.now() - entry.createdTimestamp > 12_000) return;
    const executor = entry.executor;
    if (!executor || executor.id === botId) return;
    if (executor.id === guild.ownerId) return;
    if (isWhitelisted(guild.id, executor.id, botId, 'all')) return;

    // Dangerous role perms elevation
    if (kind === 'role' && guildOrRole.permissions) {
      const dangerous = [
        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ManageChannels,
      ];
      const hasDanger = dangerous.some((p) => guildOrRole.permissions.has(p));
      if (!hasDanger) return;
    }

    const member = await guild.members.fetch(executor.id).catch(() => null);
    const mode =
      nuke?.autoModes?.create_roles ||
      protectiondb.get(`autoMode_create_roles_${guild.id}_${botId}`) ||
      'strip_roles';
    const mapped =
      mode === 'delete_roles' || mode === 'strip_roles'
        ? 'strip_roles'
        : mode === 'ban'
          ? 'ban'
          : mode === 'kick'
            ? 'kick'
            : 'strip_roles';
    await applyPunishment(member, mapped, {
      reason: `Dangerous ${kind} update`,
    });
    await sendProtectionLog(
      guild,
      botId,
      `Dangerous ${kind} update by ${executor.tag || executor.id}`,
    );
  } catch (err) {
    console.warn(`[protection] dangerous ${kind}: ${err?.message || err}`);
  }
}

module.exports = {
  handleMemberAdd,
  handleMessage,
  handleWebhooksUpdate,
  handleDangerousUpdate,
  activateLockdown,
  deactivateLockdown,
  syncLockdownState,
  attachLockdownPoll,
  stopLockdownPoll,
  getConfig,
  isWhitelisted,
  sendProtectionLog,
  notifyOwnerIfEnabled,
  shouldNotifyOwner,
};
