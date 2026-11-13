const { prisma } = require('@maker/database');
const platformCache = require('../platformCache');

function mirror() {
  return platformCache.createPlatformDb('bot_prefixes_mirror');
}

function normalizeKey(key) {
  const k = String(key);
  if (k.startsWith('Prefix_')) return k.slice('Prefix_'.length);
  return k;
}

function getSync(key) {
  const clientId = normalizeKey(key);
  return (
    mirror().get(`Prefix_${clientId}`) ??
    mirror().get(clientId) ??
    undefined
  );
}

async function set(key, prefix) {
  const clientId = normalizeKey(key);
  const value = String(prefix || '#');
  mirror().set(`Prefix_${clientId}`, value);
  mirror().set(clientId, value);
  await prisma.botPrefix.upsert({
    where: { clientId },
    create: { clientId, prefix: value },
    update: { prefix: value },
  });
  return value;
}

function setSync(key, prefix) {
  const clientId = normalizeKey(key);
  const value = String(prefix || '#');
  mirror().set(`Prefix_${clientId}`, value);
  mirror().set(clientId, value);
  void set(clientId, value);
  return value;
}

function allSync() {
  return mirror().all() || [];
}

module.exports = { getSync, set, setSync, allSync, normalizeKey };
