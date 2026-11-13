/**
 * Shared status / enable-channel key resolution for bot command gating.
 * Slash-only catalog entries have empty prefix_commandName; fall back to
 * slash_commandName / name so dashboard Status_{botId}_{name} keys match.
 */

function resolveCommandId(com) {
  if (!com || typeof com !== 'object') return '';
  return String(
    com.prefix_commandName ||
      com.slash_commandName ||
      com.name ||
      '',
  );
}

function statusKey(botId, comOrCommandId) {
  const id =
    typeof comOrCommandId === 'string' || typeof comOrCommandId === 'number'
      ? String(comOrCommandId)
      : resolveCommandId(comOrCommandId);
  return `Status_${botId}_${id}`;
}

function statusPrefixKey(botId, comOrCommandId) {
  const id =
    typeof comOrCommandId === 'string' || typeof comOrCommandId === 'number'
      ? String(comOrCommandId)
      : resolveCommandId(comOrCommandId);
  return `Status_prefix_${botId}_${id}`;
}

function statusSlashKey(botId, comOrCommandId) {
  const id =
    typeof comOrCommandId === 'string' || typeof comOrCommandId === 'number'
      ? String(comOrCommandId)
      : resolveCommandId(comOrCommandId);
  return `Status_slash_${botId}_${id}`;
}

function enableChannelsKey(botId, comOrCommandId) {
  const id =
    typeof comOrCommandId === 'string' || typeof comOrCommandId === 'number'
      ? String(comOrCommandId)
      : resolveCommandId(comOrCommandId);
  return `Enable_${id}_${botId}`;
}

function permissionsKey(botId, comOrCommandId) {
  const id =
    typeof comOrCommandId === 'string' || typeof comOrCommandId === 'number'
      ? String(comOrCommandId)
      : resolveCommandId(comOrCommandId);
  return `CommandPermissions_${id}_${botId}`;
}

function enableRolesKey(botId, comOrCommandId) {
  const id =
    typeof comOrCommandId === 'string' || typeof comOrCommandId === 'number'
      ? String(comOrCommandId)
      : resolveCommandId(comOrCommandId);
  return `EnableRoles_${id}_${botId}`;
}

/**
 * @param {Record<string, any>|Function} statusGet - map or get(key)
 * @param {string} botId
 * @param {string} cmdId
 * @param {'prefix'|'slash'|'any'} mode
 */
function isModeEnabled(statusGet, botId, cmdId, mode = 'any') {
  const get =
    typeof statusGet === 'function'
      ? statusGet
      : (key) => statusGet?.[key];

  const master = get(statusKey(botId, cmdId));
  const masterOn = master !== false;

  if (mode === 'any') return masterOn;

  const modeKey =
    mode === 'prefix'
      ? statusPrefixKey(botId, cmdId)
      : statusSlashKey(botId, cmdId);
  const modeVal = get(modeKey);
  // Explicit per-mode flags win; absent → follow master
  if (modeVal === false) return false;
  if (modeVal === true) return true;
  return masterOn;
}

module.exports = {
  resolveCommandId,
  statusKey,
  statusPrefixKey,
  statusSlashKey,
  enableChannelsKey,
  enableRolesKey,
  permissionsKey,
  isModeEnabled,
};
