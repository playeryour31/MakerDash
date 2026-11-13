import IORedis from 'ioredis';
import net from 'net';

let shared: IORedis | null = null;
let redisErrorLogged = false;

export function getRedisUrl(): string {
  return (
    process.env.REDIS_URL ||
    process.env.REDIS_URI ||
    'redis://127.0.0.1:6379'
  );
}

function redisOpts(): {
  maxRetriesPerRequest: null;
  enableReadyCheck: boolean;
  enableOfflineQueue: boolean;
  lazyConnect: boolean;
  retryStrategy: (times: number) => number | null;
} {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying
      return Math.min(times * 200, 1000);
    },
  };
}

function attachGuards(client: IORedis): IORedis {
  client.on('error', (err) => {
    if (!redisErrorLogged) {
      redisErrorLogged = true;
      console.warn(
        `[redis] unavailable (${getRedisUrl()}): ${err.message} — BullMQ disabled until Redis is up`,
      );
    }
  });
  return client;
}

/** Shared ioredis connection (maxRetriesPerRequest null required by BullMQ). */
export function getRedisConnection(): IORedis {
  if (!shared) {
    shared = attachGuards(new IORedis(getRedisUrl(), redisOpts()));
  }
  return shared;
}

export function createRedisConnection(): IORedis {
  return attachGuards(new IORedis(getRedisUrl(), redisOpts()));
}

/** Pure TCP probe (ignores ENABLE_BOT_QUEUE). */
export async function probeRedisTcp(timeoutMs = 400): Promise<boolean> {
  let host = '127.0.0.1';
  let port = 6379;
  try {
    const url = new URL(getRedisUrl());
    host = url.hostname || host;
    port = Number(url.port || 6379);
  } catch {
    /* keep defaults */
  }
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      clearTimeout(t);
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    const t = setTimeout(() => done(false), timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

/** TCP probe — does not leave a reconnecting ioredis client hanging. */
export async function isRedisReachable(timeoutMs = 800): Promise<boolean> {
  if (
    process.env.ENABLE_BOT_QUEUE === '0' ||
    process.env.ENABLE_BOT_QUEUE === 'false'
  ) {
    return false;
  }
  return probeRedisTcp(timeoutMs);
}

export async function closeRedisConnection(): Promise<void> {
  if (shared) {
    try {
      await shared.quit();
    } catch {
      shared.disconnect();
    }
    shared = null;
  }
}
