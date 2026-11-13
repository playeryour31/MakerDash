import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;

function resolveKey(secret?: string): Buffer {
  const raw =
    secret ||
    process.env.BOT_TOKEN_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'dev-only-bot-token-key-change-me';
  return scryptSync(raw, 'maker-bot-token-v1', KEY_LEN);
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

/** Decrypt stored token. Throws if ciphertext is invalid. */
export function decryptBotToken(cipherText: string, secret?: string): string {
  const key = resolveKey(secret);
  const [ivB64, tagB64, dataB64] = cipherText.split(':');
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
