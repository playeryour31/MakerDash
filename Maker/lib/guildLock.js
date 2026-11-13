/**
 * Lock customer bots to the guild ID set at purchase (Server / guild / Servers[0]).
 * Leaves any other guilds so systems only see the paid server.
 */

function resolveLockedGuildId(tokenRow) {
  if (!tokenRow || typeof tokenRow !== 'object') return null;
  const raw =
    tokenRow.Server ||
    tokenRow.guild ||
    tokenRow.serverId ||
    tokenRow.guildId ||
    (Array.isArray(tokenRow.Servers) && tokenRow.Servers[0]) ||
    null;
  const id = raw != null ? String(raw).trim() : '';
  return id || null;
}

function loadLockedGuildIdForClient(client) {
  if (client?.makerServerId) return String(client.makerServerId);
  try {
    const path = require('path');
    const fs = require('fs');
    const file = path.join(__dirname, '..', '..', 'Database', 'Others', 'Tokens.json');
    if (!fs.existsSync(file)) return null;
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(list)) return null;
    const botId = String(client?.user?.id || '');
    const row = list.find((t) => String(t?.ClientID) === botId);
    return resolveLockedGuildId(row);
  } catch {
    return null;
  }
}

/**
 * Leave every guild that is not the configured purchase server.
 * @param {import('discord.js').Client} client
 * @returns {Promise<{ locked: string|null, left: number }>}
 */
async function enforceGuildLock(client) {
  const locked = loadLockedGuildIdForClient(client);
  if (!locked) {
    return { locked: null, left: 0 };
  }
  client.makerServerId = locked;

  let left = 0;
  const guilds = [...(client.guilds?.cache?.values?.() || [])];
  for (const guild of guilds) {
    if (String(guild.id) === locked) continue;
    try {
      await guild.leave();
      left += 1;
      console.warn(
        `[guild-lock] ${client.user?.id} left unauthorized guild ${guild.id} (locked=${locked})`,
      );
    } catch (err) {
      console.warn(
        `[guild-lock] leave failed ${guild.id}: ${err?.message || err}`,
      );
    }
  }
  return { locked, left };
}

/**
 * If this guild is not the locked server, leave immediately.
 * @returns {Promise<boolean>} true if left / should skip further handlers
 */
async function leaveIfUnauthorized(client, guild) {
  if (!guild?.id) return false;
  const locked = loadLockedGuildIdForClient(client);
  if (!locked) return false;
  if (String(guild.id) === locked) return false;
  try {
    await guild.leave();
    console.warn(
      `[guild-lock] ${client.user?.id} rejected join of ${guild.id} (locked=${locked})`,
    );
  } catch (err) {
    console.warn(
      `[guild-lock] reject leave failed ${guild.id}: ${err?.message || err}`,
    );
  }
  return true;
}

function buildBotInviteUrl(clientId, guildId) {
  const base = `https://discord.com/api/oauth2/authorize?client_id=${encodeURIComponent(
    String(clientId),
  )}&permissions=8&scope=bot%20applications.commands`;
  if (!guildId) return base;
  return `${base}&guild_id=${encodeURIComponent(String(guildId))}&disable_guild_select=true`;
}

module.exports = {
  resolveLockedGuildId,
  loadLockedGuildIdForClient,
  enforceGuildLock,
  leaveIfUnauthorized,
  buildBotInviteUrl,
};
