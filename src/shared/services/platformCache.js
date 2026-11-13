/**
 * In-memory PlatformRecord cache (sync get/set) with async PG flush.
 * Nest API can publish platform:kv events; startKvSubscriber primes this cache.
 * When Redis is down, a short poll rehydrates dashboard-critical namespaces.
 */
const { prisma } = require('@maker/database');

/** @type {Map<string, Map<string, any>>} */
const caches = new Map();
/** @type {Map<string, any>} */
const pending = new Map();
let flushTimer = null;
let hydrated = false;
/** @type {import('ioredis').default | null} */
let kvSubscriber = null;
let kvSubscriberStarted = false;
let livePollTimer = null;

const LIVE_NAMESPACES = [
  'command_status',
  'aliases',
  'enable_channels',
  'enable_roles',
  'botmaker_permissions',
];

function nsMap(namespace) {
  if (!caches.has(namespace)) caches.set(namespace, new Map());
  return caches.get(namespace);
}

function queueWrite(namespace, key, value, deleted = false) {
  pending.set(`${namespace}\0${key}`, { namespace, key, value, deleted });
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPending();
  }, 50);
}

async function flushPending() {
  const batch = [...pending.values()];
  pending.clear();
  for (const item of batch) {
    try {
      if (item.deleted) {
        await prisma.platformRecord.deleteMany({
          where: { namespace: item.namespace, key: item.key },
        });
      } else {
        await prisma.platformRecord.upsert({
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
        `[platformCache] flush ${item.namespace}/${item.key}: ${err.message}`,
      );
    }
  }
}

async function hydrateAll() {
  const rows = await prisma.platformRecord.findMany({
    select: { namespace: true, key: true, value: true },
  });
  caches.clear();
  for (const row of rows) {
    nsMap(row.namespace).set(row.key, row.value);
  }
  hydrated = true;
  console.log(`[platformCache] hydrated ${rows.length} platform records`);
  return rows.length;
}

/** Re-read selected namespaces from Postgres into memory. */
async function hydrateNamespaces(namespaces) {
  const list = Array.isArray(namespaces) ? namespaces : LIVE_NAMESPACES;
  const rows = await prisma.platformRecord.findMany({
    where: { namespace: { in: list } },
    select: { namespace: true, key: true, value: true },
  });
  for (const ns of list) {
    caches.set(ns, new Map());
  }
  for (const row of rows) {
    nsMap(row.namespace).set(row.key, row.value);
  }
  hydrated = true;
  return rows.length;
}

function isHydrated() {
  return hydrated;
}

function prime(namespace, key, value) {
  nsMap(String(namespace)).set(String(key), value);
}

function forget(namespace, key) {
  nsMap(String(namespace)).delete(String(key));
}

function applyKvMessage(raw) {
  try {
    const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!msg?.namespace || msg.key == null || msg.key === '') return;
    if (msg.deleted) forget(msg.namespace, msg.key);
    else prime(msg.namespace, msg.key, msg.value);
  } catch {
    /* ignore malformed */
  }
}

function startLiveSyncFallback() {
  if (livePollTimer) return;
  const { getScheduler } = require('../runtime/scheduler');
  livePollTimer = getScheduler().every(
    4000,
    () => {
      void hydrateNamespaces(LIVE_NAMESPACES).catch((err) => {
        console.warn(
          `[platformCache] live poll failed: ${err?.message || err}`,
        );
      });
    },
    { name: 'platform-cache-live-poll', scope: 'process' },
  );
  console.log(
    `[platformCache] live poll every 4s for ${LIVE_NAMESPACES.join(', ')}`,
  );
}

async function startKvSubscriber() {
  startLiveSyncFallback();
  if (kvSubscriberStarted) return;
  kvSubscriberStarted = true;
  try {
    const {
      createRedisConnection,
      PLATFORM_KV_CHANNEL,
    } = require('@maker/queue');
    const sub = createRedisConnection();
    kvSubscriber = sub;
    if (sub.status !== 'ready') {
      await sub.connect();
    }
    await sub.subscribe(PLATFORM_KV_CHANNEL);
    sub.on('message', (_channel, message) => {
      applyKvMessage(message);
    });
    console.log(`[platformCache] subscribed to ${PLATFORM_KV_CHANNEL}`);
  } catch (err) {
    kvSubscriberStarted = false;
    console.warn(
      `[platformCache] kv subscriber failed: ${err?.message || err} (using PG poll)`,
    );
  }
}

function createPlatformDb(namespace) {
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
    has(key) {
      return map().has(String(key));
    },
    push(key, value) {
      const cur = map().get(String(key));
      const arr = Array.isArray(cur) ? [...cur] : [];
      arr.push(value);
      map().set(String(key), arr);
      queueWrite(namespace, String(key), arr, false);
      return arr;
    },
    pull(key, value) {
      const cur = map().get(String(key));
      if (!Array.isArray(cur)) return this.delete(key);
      const next = cur.filter((x) => x !== value);
      map().set(String(key), next);
      queueWrite(namespace, String(key), next, false);
      return next;
    },
    all() {
      return [...map().entries()].map(([ID, data]) => ({ ID, data }));
    },
  };
}

module.exports = {
  hydrateAll,
  hydrateNamespaces,
  isHydrated,
  createPlatformDb,
  flushPending,
  prime,
  forget,
  startKvSubscriber,
  startLiveSyncFallback,
  applyKvMessage,
};
