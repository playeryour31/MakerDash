import { createRedisConnection, probeRedisTcp } from './connection';

export const PLATFORM_KV_CHANNEL = 'platform:kv';

export type PlatformKvMessage = {
  namespace: string;
  key: string;
  value?: unknown;
  deleted?: boolean;
};

let redisDownUntil = 0;
let redisDownLogged = false;

/**
 * Best-effort pub so the bot process can prime platformCache without restart.
 * Skips quietly when Redis is down (bot uses PG poll fallback).
 */
export async function publishPlatformKv(message: PlatformKvMessage): Promise<void> {
  if (!message?.namespace || message.key == null || message.key === '') return;

  const now = Date.now();
  if (now < redisDownUntil) return;

  const reachable = await probeRedisTcp(300);
  if (!reachable) {
    redisDownUntil = now + 30_000;
    if (!redisDownLogged) {
      redisDownLogged = true;
      console.warn(
        '[platform-kv] Redis unavailable — live pub/sub skipped (bot syncs via PG poll). Start Redis to silence this.',
      );
    }
    return;
  }
  redisDownLogged = false;

  const payload = JSON.stringify({
    namespace: String(message.namespace),
    key: String(message.key),
    value: message.deleted ? null : (message.value ?? null),
    deleted: Boolean(message.deleted),
  });
  const r = createRedisConnection();
  try {
    if (r.status !== 'ready') {
      await r.connect();
    }
    await r.publish(PLATFORM_KV_CHANNEL, payload);
  } catch (err: any) {
    redisDownUntil = Date.now() + 30_000;
    if (!redisDownLogged) {
      redisDownLogged = true;
      console.warn(`[platform-kv] publish failed: ${err?.message || err} — using bot PG poll`);
    }
  } finally {
    try {
      await r.quit();
    } catch {
      r.disconnect();
    }
  }
}
