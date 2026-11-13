const { prisma } = require('@maker/database');
const platformCache = require('../platformCache');

function mirror() {
  return platformCache.createPlatformDb('bot_command_configs_mirror');
}

function getSync(clientId) {
  return mirror().get(String(clientId));
}

async function set(clientId, commands) {
  const id = String(clientId);
  const value = Array.isArray(commands) ? commands : [];
  mirror().set(id, value);
  await prisma.botCommandConfig.upsert({
    where: { clientId: id },
    create: { clientId: id, commands: value },
    update: { commands: value },
  });
  return value;
}

function setSync(clientId, commands) {
  const id = String(clientId);
  const value = Array.isArray(commands) ? commands : [];
  mirror().set(id, value);
  void set(id, value);
  return value;
}

function getCommandsKeySync(clientId, key) {
  // Legacy files used keys like commands_<clientId>
  if (String(key).startsWith('commands_')) {
    return getSync(clientId);
  }
  const all = getSync(clientId);
  if (all && typeof all === 'object' && !Array.isArray(all)) {
    return all[key];
  }
  return all;
}

function setCommandsKeySync(clientId, key, value) {
  if (String(key).startsWith('commands_') || key === 'commands') {
    return setSync(clientId, value);
  }
  const cur = getSync(clientId);
  const obj =
    cur && typeof cur === 'object' && !Array.isArray(cur) ? { ...cur } : {};
  obj[key] = value;
  return setSync(clientId, obj);
}

module.exports = {
  getSync,
  set,
  setSync,
  getCommandsKeySync,
  setCommandsKeySync,
};
