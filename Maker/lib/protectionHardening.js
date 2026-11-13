/**
 * Hardened Protection systems: anti-perms, recovery snapshots,
 * anti-prune, anti-server (vanity/name/icon).
 */
const {
  PermissionFlagsBits,
  ChannelType,
  AuditLogEvent,
} = require('discord.js');
const protectiondb = require('./featureDb')('protection');

const deleteBuckets = new Map(); // `${guildId}:${botId}:channels` -> timestamps

function hasProtectionCommands(client) {
  try {
    const { Database } = require('st.db');
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

function saveConfig(guildId, botId, cfg) {
  protectiondb.set(`protectionConfig_${guildId}_${botId}`, cfg);
}

function snapshotKey(guildId, botId) {
  return `protectionSnapshot_${guildId}_${botId}`;
}

function isTrusted(cfg, userId, guild) {
  if (!userId) return false;
  if (guild && String(userId) === String(guild.ownerId)) return true;
  const list = cfg['anti-perms']?.trustedUserIds;
  if (Array.isArray(list) && list.map(String).includes(String(userId))) {
    return true;
  }
  const entries = cfg.whitelist?.entries;
  if (Array.isArray(entries)) {
    const hit = entries.find((e) => String(e.userId) === String(userId));
    if (hit) {
      const actions = Array.isArray(hit.actions) ? hit.actions.map(String) : [];
      if (actions.includes('all') || actions.includes('anti-perms')) return true;
    }
  }
  return false;
}

async function sendLog(guild, botId, description) {
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
      await channel
        .send({ content: description.slice(0, 1900) })
        .catch(() => {});
    }
  }
  try {
    const { notifyOwnerIfEnabled } = require('./protectionAdvanced');
    await notifyOwnerIfEnabled(guild, botId, description);
  } catch (_) {}
}

async function applyPunishment(member, punishment, opts = {}) {
  if (!member) return;
  const reason = opts.reason || 'Protection hardening';
  try {
    switch (punishment) {
      case 'timeout': {
        const ms = Math.min(
          Math.max(Number(opts.timeoutSeconds || 600) * 1000, 10_000),
          28 * 24 * 60 * 60 * 1000,
        );
        await member.timeout(ms, reason).catch(() => {});
        break;
      }
      case 'kick':
        await member.kick(reason).catch(() => {});
        break;
      case 'ban':
        await member.ban({ reason, deleteMessageSeconds: 0 }).catch(() => {});
        break;
      case 'strip_roles':
      default: {
        const removable = member.roles.cache.filter(
          (r) => r.id !== member.guild.id && r.editable,
        );
        if (removable.size) {
          await member.roles.remove(removable, reason).catch(() => {});
        }
        break;
      }
    }
  } catch (err) {
    console.warn(`[protection-harden] punish: ${err?.message || err}`);
  }
}

function roleIsDangerous(role, permsCfg) {
  if (!role?.permissions) return false;
  const checks = [
    [permsCfg.blockAdministrator !== false, PermissionFlagsBits.Administrator],
    [permsCfg.blockManageGuild !== false, PermissionFlagsBits.ManageGuild],
    [Boolean(permsCfg.blockManageRoles), PermissionFlagsBits.ManageRoles],
    [Boolean(permsCfg.blockManageChannels), PermissionFlagsBits.ManageChannels],
    [Boolean(permsCfg.blockBanMembers), PermissionFlagsBits.BanMembers],
    [Boolean(permsCfg.blockKickMembers), PermissionFlagsBits.KickMembers],
    [
      permsCfg.blockMentionEveryone !== false,
      PermissionFlagsBits.MentionEveryone,
    ],
  ];
  return checks.some(([watch, bit]) => watch && role.permissions.has(bit));
}

async function fetchRecentExecutor(guild, type, targetId, maxAgeMs = 12_000) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 3 });
    for (const entry of logs.entries.values()) {
      if (Date.now() - entry.createdTimestamp > maxAgeMs) continue;
      if (targetId && entry.target?.id && String(entry.target.id) !== String(targetId)) {
        continue;
      }
      return entry.executor || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function handleMemberUpdate(client, oldMember, newMember) {
  if (!newMember?.guild || !client?.user?.id) return;
  if (!hasProtectionCommands(client)) return;
  const botId = client.user.id;
  const cfg = getConfig(newMember.guild.id, botId);
  const perms = cfg['anti-perms'];
  if (!perms?.enabled) return;
  if (isTrusted(cfg, newMember.id, newMember.guild)) return;

  const added = newMember.roles.cache.filter(
    (r) => !oldMember.roles.cache.has(r.id),
  );
  if (!added.size) return;

  const dangerous = [...added.values()].filter((r) =>
    roleIsDangerous(r, perms),
  );
  if (!dangerous.length) return;

  const executor = await fetchRecentExecutor(
    newMember.guild,
    AuditLogEvent.MemberRoleUpdate,
    newMember.id,
  );
  if (executor?.id === botId) return;
  if (executor && isTrusted(cfg, executor.id, newMember.guild)) return;

  if (perms.punishGrantee !== false) {
    for (const role of dangerous) {
      if (role.editable) {
        await newMember.roles.remove(role, 'Anti-perms: dangerous role').catch(() => {});
      }
    }
  }

  if (perms.punishExecutor !== false && executor) {
    const execMember = await newMember.guild.members
      .fetch(executor.id)
      .catch(() => null);
    if (execMember && !isTrusted(cfg, execMember.id, newMember.guild)) {
      await applyPunishment(execMember, perms.punishment || 'strip_roles', {
        reason: 'Anti-perms: granted dangerous role',
      });
    }
  }

  await sendLog(
    newMember.guild,
    botId,
    `🛡️ Anti-perms: blocked dangerous role(s) on ${newMember.user.tag} (${dangerous.map((r) => r.name).join(', ')})` +
      (executor ? ` by ${executor.tag || executor.id}` : ''),
  );
}

async function handleRoleUpdate(client, oldRole, newRole) {
  if (!newRole?.guild || !client?.user?.id) return;
  if (!hasProtectionCommands(client)) return;
  const botId = client.user.id;
  const cfg = getConfig(newRole.guild.id, botId);
  const perms = cfg['anti-perms'];
  if (!perms?.enabled) return;

  const wasSafe = !roleIsDangerous(oldRole, perms);
  const nowDanger = roleIsDangerous(newRole, perms);
  if (!wasSafe || !nowDanger) return;

  const executor = await fetchRecentExecutor(
    newRole.guild,
    AuditLogEvent.RoleUpdate,
    newRole.id,
  );
  if (!executor || executor.id === botId) return;
  if (isTrusted(cfg, executor.id, newRole.guild)) return;

  // Revert dangerous bits we can
  try {
    if (newRole.editable) {
      let bits = newRole.permissions;
      const strip = [
        [perms.blockAdministrator !== false, PermissionFlagsBits.Administrator],
        [perms.blockManageGuild !== false, PermissionFlagsBits.ManageGuild],
        [Boolean(perms.blockManageRoles), PermissionFlagsBits.ManageRoles],
        [Boolean(perms.blockManageChannels), PermissionFlagsBits.ManageChannels],
        [Boolean(perms.blockBanMembers), PermissionFlagsBits.BanMembers],
        [Boolean(perms.blockKickMembers), PermissionFlagsBits.KickMembers],
        [
          perms.blockMentionEveryone !== false,
          PermissionFlagsBits.MentionEveryone,
        ],
      ];
      for (const [watch, bit] of strip) {
        if (watch && bits.has(bit)) bits = bits.remove(bit);
      }
      await newRole.setPermissions(bits, 'Anti-perms: strip dangerous grants');
    }
  } catch (err) {
    console.warn(`[protection-harden] role revert: ${err?.message || err}`);
  }

  const member = await newRole.guild.members.fetch(executor.id).catch(() => null);
  await applyPunishment(member, perms.punishment || 'strip_roles', {
    reason: 'Anti-perms: elevated role permissions',
  });
  await sendLog(
    newRole.guild,
    botId,
    `🛡️ Anti-perms: reverted dangerous perms on role ${newRole.name} by ${executor.tag || executor.id}`,
  );
}

function takeGuildSnapshot(guild) {
  const roles = [...guild.roles.cache.values()]
    .filter((r) => r.id !== guild.id)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      position: r.position,
      permissions: r.permissions.bitfield.toString(),
    }));
  const channels = [...guild.channels.cache.values()]
    .filter((c) => c && typeof c.name === 'string')
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId || null,
      position: c.rawPosition ?? c.position ?? 0,
      topic: c.topic || null,
      nsfw: Boolean(c.nsfw),
      rateLimitPerUser: c.rateLimitPerUser || 0,
    }));
  return {
    takenAt: new Date().toISOString(),
    roles,
    channels,
  };
}

function saveSnapshot(guildId, botId, snap) {
  protectiondb.set(snapshotKey(guildId, botId), snap);
  const cfg = getConfig(guildId, botId);
  if (cfg.recovery) {
    cfg.recovery = { ...cfg.recovery, lastSnapshotAt: snap.takenAt };
    saveConfig(guildId, botId, cfg);
  }
}

async function restoreMissingChannels(guild, botId, snap) {
  if (!snap?.channels?.length) return 0;
  let restored = 0;
  const existingNames = new Set(
    [...guild.channels.cache.values()].map((c) => c.name.toLowerCase()),
  );
  // Parents first
  const ordered = [...snap.channels].sort((a, b) => {
    const aCat = a.type === ChannelType.GuildCategory ? 0 : 1;
    const bCat = b.type === ChannelType.GuildCategory ? 0 : 1;
    return aCat - bCat || a.position - b.position;
  });

  const idMap = new Map(); // oldId -> newId
  for (const ch of ordered) {
    if (guild.channels.cache.has(ch.id)) {
      idMap.set(ch.id, ch.id);
      continue;
    }
    if (existingNames.has(String(ch.name).toLowerCase())) continue;
    const parentId = ch.parentId
      ? idMap.get(ch.parentId) ||
        (guild.channels.cache.has(ch.parentId) ? ch.parentId : null)
      : null;
    try {
      const created = await guild.channels.create({
        name: ch.name,
        type: ch.type,
        parent: parentId || undefined,
        topic: ch.topic || undefined,
        nsfw: ch.nsfw,
        rateLimitPerUser: ch.rateLimitPerUser || undefined,
        reason: 'Maker Protection recovery',
      });
      idMap.set(ch.id, created.id);
      existingNames.add(ch.name.toLowerCase());
      restored += 1;
    } catch (err) {
      console.warn(
        `[protection-recovery] channel ${ch.name}: ${err?.message || err}`,
      );
    }
  }
  return restored;
}

async function restoreMissingRoles(guild, botId, snap) {
  if (!snap?.roles?.length) return 0;
  let restored = 0;
  const existing = new Set(
    [...guild.roles.cache.values()].map((r) => r.name.toLowerCase()),
  );
  const sorted = [...snap.roles].sort((a, b) => a.position - b.position);
  for (const role of sorted) {
    if (guild.roles.cache.has(role.id)) continue;
    if (existing.has(String(role.name).toLowerCase())) continue;
    try {
      await guild.roles.create({
        name: role.name,
        colors: role.color ? [role.color] : undefined,
        color: role.color || undefined,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: BigInt(role.permissions || '0'),
        reason: 'Maker Protection recovery',
      });
      existing.add(role.name.toLowerCase());
      restored += 1;
    } catch (err) {
      console.warn(
        `[protection-recovery] role ${role.name}: ${err?.message || err}`,
      );
    }
  }
  return restored;
}

async function maybeRecover(guild, botId, kind) {
  const cfg = getConfig(guild.id, botId);
  const recovery = cfg.recovery;
  if (!recovery?.enabled || recovery.autoRestore === false) return;

  const key = `${guild.id}:${botId}:${kind}`;
  const now = Date.now();
  const windowMs = Number(recovery.windowSeconds || 45) * 1000;
  const arr = (deleteBuckets.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  deleteBuckets.set(key, arr);

  const threshold = Number(recovery.restoreChannelThreshold || 3);
  if (arr.length < threshold) return;

  const snap = protectiondb.get(snapshotKey(guild.id, botId));
  if (!snap) {
    await sendLog(guild, botId, '⚠️ Recovery triggered but no snapshot exists yet.');
    return;
  }

  let restored = 0;
  if (kind === 'channels') {
    restored = await restoreMissingChannels(guild, botId, snap);
  } else if (kind === 'roles') {
    restored = await restoreMissingRoles(guild, botId, snap);
  }

  if (recovery.alsoLockdown) {
    try {
      const { activateLockdown } = require('./protectionAdvanced');
      await activateLockdown(guild, botId, `Auto-recovery (${kind})`);
    } catch (_) {}
  }

  await sendLog(
    guild,
    botId,
    `♻️ Recovery: restored ${restored} ${kind} from snapshot (${arr.length} deletes / ${recovery.windowSeconds}s)`,
  );
  deleteBuckets.set(key, []);
}

async function handleChannelDelete(client, channel) {
  if (!channel?.guild || !client?.user?.id) return;
  if (!hasProtectionCommands(client)) return;
  await maybeRecover(channel.guild, client.user.id, 'channels');
}

async function handleRoleDelete(client, role) {
  if (!role?.guild || !client?.user?.id) return;
  if (!hasProtectionCommands(client)) return;
  await maybeRecover(role.guild, client.user.id, 'roles');
}

async function handleGuildUpdate(client, oldGuild, newGuild) {
  if (!newGuild?.id || !client?.user?.id) return;
  if (!hasProtectionCommands(client)) return;
  const botId = client.user.id;
  const cfg = getConfig(newGuild.id, botId);
  const anti = cfg['anti-server'];
  if (!anti?.enabled) return;

  const changes = [];
  if (anti.blockName && oldGuild.name !== newGuild.name) changes.push('name');
  if (anti.blockIcon && oldGuild.icon !== newGuild.icon) changes.push('icon');
  if (anti.blockBanner && oldGuild.banner !== newGuild.banner) {
    changes.push('banner');
  }
  if (
    anti.blockVerification !== false &&
    oldGuild.verificationLevel !== newGuild.verificationLevel
  ) {
    changes.push('verification');
  }
  if (
    anti.blockVanity !== false &&
    oldGuild.vanityURLCode !== newGuild.vanityURLCode
  ) {
    changes.push('vanity');
  }
  if (!changes.length) return;

  const executor = await fetchRecentExecutor(
    newGuild,
    AuditLogEvent.GuildUpdate,
    newGuild.id,
    15_000,
  );
  if (!executor || executor.id === botId) return;
  if (isTrusted(cfg, executor.id, newGuild)) return;

  // Best-effort revert
  try {
    const patch = {};
    if (changes.includes('name')) patch.name = oldGuild.name;
    if (changes.includes('verification')) {
      patch.verificationLevel = oldGuild.verificationLevel;
    }
    if (Object.keys(patch).length) {
      await newGuild.edit(patch);
    }
    if (changes.includes('icon') && oldGuild.icon) {
      await newGuild
        .setIcon(oldGuild.iconURL({ extension: 'png', size: 256 }))
        .catch(() => {});
    }
  } catch (err) {
    console.warn(`[protection-harden] guild revert: ${err?.message || err}`);
  }

  const member = await newGuild.members.fetch(executor.id).catch(() => null);
  await applyPunishment(member, anti.punishment || 'strip_roles', {
    reason: `Anti-server: ${changes.join(', ')}`,
  });

  if (anti.alsoLockdown) {
    try {
      const { activateLockdown } = require('./protectionAdvanced');
      await activateLockdown(newGuild, botId, 'Anti-server breach');
    } catch (_) {}
  }

  await sendLog(
    newGuild,
    botId,
    `🛡️ Anti-server: blocked ${changes.join(', ')} by ${executor.tag || executor.id}`,
  );
}

async function handleMemberRemove(client, member) {
  if (!member?.guild || !client?.user?.id) return;
  if (!hasProtectionCommands(client)) return;
  const botId = client.user.id;
  const cfg = getConfig(member.guild.id, botId);
  const prune = cfg['anti-prune'];
  if (!prune?.enabled) return;

  try {
    const logs = await member.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberPrune,
      limit: 1,
    });
    const entry = logs.entries.first();
    if (!entry || Date.now() - entry.createdTimestamp > 20_000) return;
    const executor = entry.executor;
    if (!executor || executor.id === botId) return;
    if (isTrusted(cfg, executor.id, member.guild)) return;

    // Only act once per prune event
    const pruneKey = `pruneHandled_${member.guild.id}_${entry.id}_${botId}`;
    if (protectiondb.get(pruneKey)) return;
    protectiondb.set(pruneKey, true);

    const execMember = await member.guild.members
      .fetch(executor.id)
      .catch(() => null);
    await applyPunishment(execMember, prune.punishment || 'ban', {
      reason: 'Anti-prune',
    });
    if (prune.alsoLockdown !== false) {
      try {
        const { activateLockdown } = require('./protectionAdvanced');
        await activateLockdown(member.guild, botId, 'Anti-prune');
      } catch (_) {}
    }
    await sendLog(
      member.guild,
      botId,
      `🛡️ Anti-prune: punished ${executor.tag || executor.id} (removed ${entry.extra?.removed || '?'} members)`,
    );
  } catch (_) {}
}

async function syncSnapshotsForClient(client) {
  if (!client?.user?.id || !client.guilds?.cache) return;
  const botId = client.user.id;
  for (const guild of client.guilds.cache.values()) {
    const cfg = getConfig(guild.id, botId);
    if (!cfg.recovery?.enabled) continue;
    try {
      const snap = takeGuildSnapshot(guild);
      saveSnapshot(guild.id, botId, snap);
    } catch (err) {
      console.warn(
        `[protection-recovery] snapshot ${guild.id}: ${err?.message || err}`,
      );
    }
  }
}

function attachRecoveryPoll(client) {
  if (!client || client.__makerRecoveryAttached) return;
  client.__makerRecoveryAttached = true;
  const botId = client.user?.id;
  const run = () => {
    void syncSnapshotsForClient(client);
    if (!botId) return;
    const { getScheduler } = require('../../src/shared/runtime/scheduler');
    const scheduler = getScheduler();
    const scope = `bot:${botId}`;
    scheduler.stop('recovery-snapshot', scope);
    scheduler.every(
      5 * 60 * 1000,
      () => {
        void syncSnapshotsForClient(client);
      },
      { name: 'recovery-snapshot', scope },
    );
  };
  if (client.isReady?.()) run();
  else client.once('ready', run);
}

function stopRecoveryPoll(botId) {
  const { getScheduler } = require('../../src/shared/runtime/scheduler');
  getScheduler().stop('recovery-snapshot', `bot:${String(botId)}`);
}

module.exports = {
  handleMemberUpdate,
  handleRoleUpdate,
  handleChannelDelete,
  handleRoleDelete,
  handleGuildUpdate,
  handleMemberRemove,
  attachRecoveryPoll,
  stopRecoveryPoll,
  takeGuildSnapshot,
  saveSnapshot,
};
