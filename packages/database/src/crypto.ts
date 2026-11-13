import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

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
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.MAKER_ENV === 'production'
  );
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
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
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
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
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
    throw new Error(
      `[crypto] ${KEY_ENV} failed a round-trip self-test; refusing to start.`,
    );
  }
}
