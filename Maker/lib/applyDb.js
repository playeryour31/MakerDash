/**
 * Apply data access — Postgres feature cache first (SSOT).
 * Optional Nest internal API only when explicitly enabled.
 */
const botData = require('../../src/shared/services/botDataClient');

function localDb() {
  const featureCache = require('../../src/shared/services/featureCache');
  return featureCache.createFeatureDb('apply_legacy');
}

async function get(key) {
  try {
    const v = localDb().get(key);
    if (v !== undefined && v !== null) return v;
  } catch {
    /* fall through */
  }
  if (botData.useApi()) {
    try {
      return await botData.applyGet(key);
    } catch (err) {
      if (!get._warned) {
        get._warned = true;
        console.warn(
          `[applyDb] API unreachable — using local Prisma cache (${err.message})`,
        );
      }
    }
  }
  return undefined;
}

async function set(key, value) {
  try {
    localDb().set(key, value);
  } catch (err) {
    console.warn(`[applyDb] local set failed (${key}): ${err.message}`);
  }
  if (botData.useApi()) {
    try {
      await botData.applySet(key, value);
    } catch {
      /* local already written */
    }
  }
  return value;
}

async function del(key) {
  try {
    localDb().delete(key);
  } catch {
    /* ignore */
  }
  if (botData.useApi()) {
    try {
      await botData.applyDelete(key);
    } catch {
      /* ignore */
    }
  }
  return true;
}

module.exports = {
  get,
  set,
  delete: del,
  getSync(key) {
    try {
      return localDb().get(key);
    } catch {
      return undefined;
    }
  },
  useApi: botData.useApi,
};
