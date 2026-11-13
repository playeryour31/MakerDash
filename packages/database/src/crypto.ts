import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const SALT = 'maker-bot-token-v1';
const KEY_ENV = 'BOT_TOKEN_ENCRYPTION_KEY';
/** Refuse weak keys: 32 chars is the minimum for a real random secret. */
const MIN_KEY_LENGTH = 32;

/** Derived keys are cached: scryptSync is intentionally slow (~50-100ms). */
const keyCache = new Map<string, Buffer>();
let warnedJwtFallback = false;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.MAKER_ENV === 'production';
}

function deriveKey(raw: string): Buffer {
  let key = keyCache.get(raw);
  if (!key) {
    key = scryptSync(raw, SALT, KEY_LEN);
    keyCache.set(raw, key);
  }
  return key;
}

/**
 * Resolve the AES key.
 *
 * Order:
 *   1. explicit `secret` (tests / one-off tooling)
 *   2. BOT_TOKEN_ENCRYPTION_KEY  ← required in production
 *   3. JWT_SECRET (legacy, non-production only, with a loud warning)
 *
 * There is deliberately no hard-coded fallback: silently encrypting with a
 * public constant would make every stored token decryptable by anyone.
 */
function resolveKey(secret?: string): Buffer {
  if (secret) {
    if (secret.length < MIN_KEY_LENGTH) {
      throw new Error(
        `[crypto] Explicit encryption secret is too short (${secret.length} < ${MIN_KEY_LENGTH}).`,
      );
    }
    return deriveKey(secret);
  }

  const primary = (process.env[KEY_ENV] || '').trim();
  if (primary) {
    if (primary.length < MIN_KEY_LENGTH) {
      throw new Error(
        `[crypto] ${KEY_ENV} is too short (${primary.length} < ${MIN_KEY_LENGTH} chars). ` +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    return deriveKey(primary);
  }

  const jwt = (process.env.JWT_SECRET || '').trim();
  if (jwt && !isProduction()) {
    if (!warnedJwtFallback) {
      warnedJwtFallback = true;
      console.warn(
        `[crypto] ${KEY_ENV} is missing — falling back to JWT_SECRET (legacy dev only). ` +
          'Set BOT_TOKEN_ENCRYPTION_KEY in Apps/api/.env and packages/database/.env.',
      );
    }
    if (jwt.length < MIN_KEY_LENGTH) {
      throw new Error(
        `[crypto] Neither ${KEY_ENV} nor a strong JWT_SECRET is set; cannot derive the bot-token key.`,
      );
    }
    return deriveKey(jwt);
  }

  throw new Error(
    `[crypto] ${KEY_ENV} is required to encrypt/decrypt bot tokens. ` +
      'Set the same value in Apps/api/.env and packages/database/.env ' +
      '(see .env.production.checklist.md).',
  );
}

/** Encrypt plaintext Discord bot token for at-rest storage. */
export function encryptBotToken(plain: string, secret?: string): string {
  const key = resolveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/** Decrypt stored token. Throws if the key is missing/wrong or the payload is invalid. */
export function decryptBotToken(cipherText: string, secret?: string): string {
  const key = resolveKey(secret);
  const [ivB64, tagB64, dataB64] = String(cipherText || '').split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid tokenEnc format');
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return dec.toString('utf8');
}

/**
 * Fail fast at boot when the token-encryption key is unusable.
 * Also proves the key can encrypt + decrypt before the app serves traffic.
 */
export function assertTokenEncryptionKey(secret?: string): void {
  const probe = 'maker-key-self-test';
  const roundTrip = decryptBotToken(encryptBotToken(probe, secret), secret);
  if (roundTrip !== probe) {
    throw new Error(`[crypto] ${KEY_ENV} failed a round-trip self-test; refusing to start.`);
  }
  const poolRoundTrip = decryptPoolToken(encryptPoolToken(probe, secret), secret);
  if (poolRoundTrip !== probe) {
    throw new Error(`[crypto] ${KEY_ENV} failed the token-pool self-test; refusing to start.`);
  }
}

/* ------------------------------------------------------------------ *
 * Token-pool entries
 *
 * Pool rows are keyed by `@@unique([kind, token])`, so the stored value
 * must stay a deterministic function of the plaintext: the same token has
 * to produce the same ciphertext or the unique constraint stops working
 * and every import would duplicate rows.
 *
 * That rules out a random IV. Instead the IV is derived with HMAC from the
 * plaintext itself (encrypt-then-MAC style key separation), which is safe
 * for this use: identical plaintexts get an identical IV + ciphertext, and
 * different plaintexts get unrelated IVs. The usual GCM-IV-reuse hazard
 * (same IV, different plaintext) cannot happen.
 *
 * The trade-off is that the database reveals *equality* of tokens, which
 * the unique index already revealed. It does not reveal the token itself.
 * ------------------------------------------------------------------ */

const POOL_PREFIX = 'pool:v1:';
const POOL_IV_CONTEXT = 'maker-token-pool-iv-v1';

function poolIv(plain: string, key: Buffer): Buffer {
  return createHmac('sha256', key)
    .update(POOL_IV_CONTEXT)
    .update('\0')
    .update(plain, 'utf8')
    .digest()
    .subarray(0, 12);
}

/** True when a stored value is an encrypted pool token (vs. a legacy plaintext row). */
export function isEncryptedPoolToken(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(POOL_PREFIX);
}

/**
 * Encrypt a pool token deterministically. Already-encrypted values pass through,
 * so the function is safe to call on data that was migrated twice.
 */
export function encryptPoolToken(plain: string, secret?: string): string {
  const value = String(plain);
  if (isEncryptedPoolToken(value)) return value;
  const key = resolveKey(secret);
  const iv = poolIv(value, key);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${POOL_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/**
 * Decrypt a pool token.
 *
 * Values without the `pool:v1:` prefix are returned unchanged so rows written
 * before at-rest encryption keep working until `npm run db:encrypt:tokens`
 * rewrites them.
 */
export function decryptPoolToken(stored: string, secret?: string): string {
  const value = String(stored ?? '');
  if (!isEncryptedPoolToken(value)) return value;
  const [ivB64, tagB64, dataB64] = value.slice(POOL_PREFIX.length).split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid pool token format');
  }
  const key = resolveKey(secret);
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return dec.toString('utf8');
}
