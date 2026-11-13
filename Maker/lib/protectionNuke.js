/**
 * Shared helpers for legacy anti-nuke Events.
 * Respects dashboard `protectionConfig_*` (enabled, windowMinutes, whitelist)
 * while still reading synced legacy actionLimit_ / autoMode_ keys.
 */
const moment = require('moment-timezone');
const protectiondb = require('./featureDb')('protection');
const { getConfig, isWhitelisted, shouldNotifyOwner } = require('./protectionAdvanced');

function isAntiNukeEnabled(guildId, botId) {
  const cfg = getConfig(guildId, botId);
  const nuke = cfg['anti-nuke'];
  if (nuke && nuke.enabled === false) return false;
  return true;
}

function getWindowMinutes(guildId, botId) {
  const cfg = getConfig(guildId, botId);
  const w = Number(cfg['anti-nuke']?.windowMinutes);
  return Number.isFinite(w) && w > 0 ? w : 20;
}

function getActionLimit(guildId, botId, action) {
  const cfg = getConfig(guildId, botId);
  const fromCfg = cfg['anti-nuke']?.limits?.[action];
  if (fromCfg != null && fromCfg !== '') {
    const n = Number(fromCfg);
    return Number.isFinite(n) ? n : 5;
  }
  return (
    protectiondb.get(`actionLimit_${action}_${guildId}_${botId}`) || 5
  );
}

function getAutoMode(guildId, botId, action) {
  const cfg = getConfig(guildId, botId);
  const fromCfg = cfg['anti-nuke']?.autoModes?.[action];
  if (fromCfg) {
    return fromCfg === 'strip_roles' ? 'delete_roles' : String(fromCfg);
  }
  return (
    protectiondb.get(`autoMode_${action}_${guildId}_${botId}`) ||
    'delete_roles'
  );
}

/** Whitelist check must always use the audit executor, never the victim/target. */
function isNukeWhitelisted(guildId, executorId, botId, action) {
  if (!executorId) return false;
  return isWhitelisted(guildId, executorId, botId, action);
}

function getProtectionLogId(guildId, botId) {
  const cfg = getConfig(guildId, botId);
  return (
    cfg.general?.logChannelId ||
    protectiondb.get(`protectionLog_${guildId}_${botId}`) ||
    null
  );
}

/**
 * Increment action counter and schedule expiry using dashboard windowMinutes.
 * Returns the count BEFORE increment (legacy punish when count >= limit).
 */
function bumpNukeCount(guildId, botId, action, executorId) {
  const key = `protectionData_${action}_${guildId}_${executorId}_${botId}`;
  const userData = protectiondb.get(key) || 0;
  const windowMinutes = getWindowMinutes(guildId, botId);
  const endTime = moment()
    .add(windowMinutes, 'minutes')
    .format('YYYY-MM-DD HH:mm:ss');
  protectiondb.set(key, userData + 1).then(() => {
    protectiondb.push(`protectionTimer_${botId}`, {
      ID: executorId,
      action,
      Time: endTime,
      server: guildId,
      Number: userData,
    });
  });
  return userData;
}

module.exports = {
  isAntiNukeEnabled,
  getWindowMinutes,
  getActionLimit,
  getAutoMode,
  isNukeWhitelisted,
  getProtectionLogId,
  bumpNukeCount,
  shouldNotifyOwner,
};
