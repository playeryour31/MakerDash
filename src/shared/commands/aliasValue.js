/**
 * Alias value helpers — legacy string or { command, requirePrefix }.
 */

function normalizeAliasValue(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string' || typeof raw === 'number') {
    const command = String(raw);
    if (!command) return null;
    return { command, requirePrefix: false };
  }
  if (typeof raw === 'object') {
    const command = String(raw.command || raw.commandName || '');
    if (!command) return null;
    return {
      command,
      requirePrefix: Boolean(raw.requirePrefix),
    };
  }
  return null;
}

function aliasCommandName(raw) {
  return normalizeAliasValue(raw)?.command || null;
}

module.exports = {
  normalizeAliasValue,
  aliasCommandName,
};
