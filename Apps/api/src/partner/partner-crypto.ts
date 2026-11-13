import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { encryptBotToken, decryptBotToken } from '@maker/database';

export function hashPartnerSecret(secret: string): string {
  return createHash('sha256').update(String(secret), 'utf8').digest('hex');
}

export function encryptPartnerSecret(secret: string): string {
  return encryptBotToken(String(secret));
}

export function decryptPartnerSecret(secretEnc: string): string {
  return decryptBotToken(String(secretEnc));
}

export function generatePartnerCredentials(): { keyId: string; secret: string } {
  const keyId = `pk_${randomBytes(12).toString('hex')}`;
  const secret = `ps_${randomBytes(32).toString('base64url')}`;
  return { keyId, secret };
}

export function signPartnerPayload(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(String(a), 'utf8');
    const bb = Buffer.from(String(b), 'utf8');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Timing-safe compare for arbitrary UTF-8 secrets (API keys). */
export function safeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(String(a), 'utf8');
    const bb = Buffer.from(String(b), 'utf8');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
