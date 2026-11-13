const { prisma } = require('@maker/database');
const platformCache = require('../platformCache');

function mirror() {
  return platformCache.createPlatformDb('bot_runtimes_mirror');
}

async function getMap() {
  const rows = await prisma.botRuntime.findMany();
  const out = {};
  for (const r of rows) {
    out[r.clientId] = r.running;
    mirror().set(r.clientId, r.running);
  }
  return out;
}

function getMapSync() {
  const rows = mirror().all() || [];
  const out = {};
  for (const r of rows) out[r.ID] = Boolean(r.data);
  return out;
}

function isRunningSync(clientId) {
  return Boolean(mirror().get(String(clientId)));
}

async function setRunning(clientId, running) {
  const id = String(clientId);
  const value = Boolean(running);
  mirror().set(id, value);

  try {
    const bot = await prisma.botInstance.findUnique({
      where: { clientId: id },
      select: { clientId: true },
    });
    if (!bot) {
      // Avoid P2003 — runtime row requires BotInstance (FK)
      return value;
    }

    await prisma.botRuntime.upsert({
      where: { clientId: id },
      create: { clientId: id, running: value },
      update: { running: value },
    });
  } catch (err) {
    // P2003 = BotInstance gone (expected during purge races) — keep quiet
    if (err?.code === 'P2003') return value;
    console.warn(
      `[runtime] setRunning(${id}=${value}) PG failed: ${err.code || err.message}`,
    );
  }
  return value;
}

function setRunningSync(clientId, running) {
  const id = String(clientId);
  const value = Boolean(running);
  mirror().set(id, value);
  void setRunning(id, value).catch((err) => {
    console.warn(`[runtime] setRunningSync PG failed: ${err.message}`);
  });
  return value;
}

module.exports = {
  getMap,
  getMapSync,
  isRunningSync,
  setRunning,
  setRunningSync,
};
