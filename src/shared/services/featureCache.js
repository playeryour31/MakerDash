/**
 * In-memory FeatureRecord cache for Discord bots (sync get/set API).
 * Hydrate from Postgres on boot; writes update cache and flush async to PG.
 */
const { prisma } = require('@maker/database');

/** @type {Map<string, Map<string, any>>} */
const caches = new Map();
/** @type {Map<string, any>} */
const pending = new Map();
let flushTimer = null;
let hydrated = false;

function nsMap(namespace) {
  if (!caches.has(namespace)) caches.set(namespace, new Map());
  return caches.get(namespace);
}

function queueWrite(namespace, key, value, deleted = false) {
  pending.set(`${namespace}\0${key}`, { namespace, key, value, deleted });
  // Best-effort Redis mirror for multi-process reads
  void redisMirrorSet(namespace, key, value, deleted);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPending();
  }, 50);
}

let redis = null;
function getRedis() {
  if (redis !== null) return redis;
  try {
    const { getRedisConnection } = require('@maker/queue');
    redis = getRedisConnection();
  } catch {
    redis = false;
  }
  return redis || null;
}

async function redisMirrorSet(namespace, key, value, deleted) {
  const r = getRedis();
  if (!r) return;
  const rk = `feature:${namespace}:${key}`;
  try {
    if (deleted) await r.del(rk);
    else await r.set(rk, JSON.stringify(value ?? null), 'EX', 86400);
  } catch {
    /* ignore redis mirror errors */
  }
}

async function redisMirrorGet(namespace, key) {
  const r = getRedis();
  if (!r) return undefined;
  try {
    const raw = await r.get(`feature:${namespace}:${key}`);
    if (raw === null || raw === undefined) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function flushPending() {
  const batch = [...pending.values()];
  pending.clear();
  for (const item of batch) {
    try {
      if (item.deleted) {
        await prisma.featureRecord.deleteMany({
          where: { namespace: item.namespace, key: item.key },
        });
      } else {
        await prisma.featureRecord.upsert({
          where: {
            namespace_key: { namespace: item.namespace, key: item.key },
          },
          create: {
            namespace: item.namespace,
            key: item.key,
            value: item.value ?? null,
          },
          update: { value: item.value ?? null },
        });
      }
    } catch (err) {
      console.warn(
        `[featureCache] flush ${item.namespace}/${item.key}: ${err.message}`,
      );
    }
  }
}

async function hydrateAll() {
  const rows = await prisma.featureRecord.findMany({
    select: { namespace: true, key: true, value: true },
  });
  caches.clear();
  for (const row of rows) {
    nsMap(row.namespace).set(row.key, row.value);
  }
  hydrated = true;
  console.log(`[featureCache] hydrated ${rows.length} feature records`);
  return rows.length;
}

function createFeatureDb(namespace) {
  const map = () => nsMap(namespace);
  return {
    get(key) {
      if (!hydrated) return undefined;
      return map().has(key) ? map().get(key) : undefined;
    },
    set(key, value) {
      map().set(String(key), value);
      queueWrite(namespace, String(key), value, false);
      return Promise.resolve(value);
    },
    delete(key) {
      map().delete(String(key));
      queueWrite(namespace, String(key), null, true);
      return Promise.resolve(true);
    },
    push(key, value) {
      const cur = this.get(key);
      const list = Array.isArray(cur) ? cur.slice() : [];
      list.push(value);
      return this.set(key, list);
    },
    pull(key, value) {
      const cur = this.get(key);
      if (!Array.isArray(cur)) return this.delete(key);
      const next = cur.filter((x) => JSON.stringify(x) !== JSON.stringify(value));
      return this.set(key, next);
    },
    has(key) {
      return map().has(String(key));
    },
    all() {
      return [...map().entries()].map(([ID, data]) => ({ ID, data }));
    },
    get namespace() {
      return namespace;
    },
  };
}

/** Update in-memory cache without scheduling a Postgres write (API already wrote). */
function prime(namespace, key, value) {
  nsMap(String(namespace)).set(String(key), value);
}

module.exports = {
  hydrateAll,
  createFeatureDb,
  flushPending,
  prime,
  isHydrated: () => hydrated,
};
