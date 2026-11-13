import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';

/**
 * OAuth CSRF protection.
 *
 * Discord only echoes `state` back. Passing the admin-invite slug or the bot
 * magic-link id straight through makes `state` guessable and cannot prove that
 * the callback belongs to the browser that started the flow (login CSRF).
 *
 * We therefore send a signed envelope that carries the original identifier plus
 * a random nonce, and keep the nonce in a short-lived, host-scoped cookie. The
 * callback is accepted only when the signature, the nonce and the age all
 * check out.
 */
export const OAUTH_STATE_COOKIE = 'maker_oauth_state';

/** The user has 10 minutes to approve the Discord consent screen. */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type Envelope = {
  /** Original identifier: undefined (plain login), `admin:<slug>` or a slug. */
  s: string | null;
  /** Random nonce, mirrored in the cookie. */
  n: string;
  /** Issued-at, milliseconds since epoch. */
  t: number;
};

function secret(explicit?: string): string {
  const value = explicit || process.env.JWT_SECRET || '';
  if (!value) {
    throw new Error(
      'JWT_SECRET is required to sign the OAuth state (see Apps/api/.env).',
    );
  }
  return value;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

function signature(payload: string, key: string): string {
  return b64url(createHmac('sha256', key).update(payload).digest());
}

function isSecure(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.MAKER_ENV === 'production'
  );
}

function cookieDomain(): string | undefined {
  const raw = (
    process.env.SESSION_COOKIE_DOMAIN ||
    process.env.COOKIE_DOMAIN ||
    ''
  ).trim();
  return raw || undefined;
}

function cookieOptions() {
  const domain = cookieDomain();
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecure(),
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

export function createOAuthNonce(): string {
  return randomBytes(16).toString('hex');
}

/** Wrap the caller-supplied identifier into a signed, nonce-bound envelope. */
export function signOAuthState(
  state: string | null | undefined,
  nonce: string,
  opts: { secret?: string; now?: number } = {},
): string {
  const envelope: Envelope = {
    s: state ? String(state) : null,
    n: nonce,
    t: opts.now ?? Date.now(),
  };
  const payload = b64url(JSON.stringify(envelope));
  return `${payload}.${signature(payload, secret(opts.secret))}`;
}

/**
 * Verify the envelope and return the original identifier.
 *
 * Throws on a bad signature, a nonce mismatch (different browser/session), or
 * an expired envelope.
 */
export function verifyOAuthState(
  wrapped: string | null | undefined,
  nonce: string | null | undefined,
  opts: { secret?: string; now?: number; ttlMs?: number } = {},
): string | null {
  const raw = String(wrapped || '');
  const [payload, mac] = raw.split('.');
  if (!payload || !mac) throw new Error('malformed_state');
  if (!nonce) throw new Error('missing_state_cookie');

  const expected = signature(payload, secret(opts.secret));
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('bad_state_signature');
  }

  let envelope: Envelope;
  try {
    envelope = JSON.parse(fromB64url(payload).toString('utf8'));
  } catch {
    throw new Error('malformed_state');
  }

  if (!envelope?.n || envelope.n !== nonce) {
    throw new Error('state_nonce_mismatch');
  }

  const ttl = opts.ttlMs ?? OAUTH_STATE_TTL_MS;
  const age = (opts.now ?? Date.now()) - Number(envelope.t || 0);
  if (!Number.isFinite(age) || age < 0 || age > ttl) {
    throw new Error('state_expired');
  }

  return envelope.s ?? null;
}

export function setOAuthStateCookie(res: Response, nonce: string): void {
  res.cookie(OAUTH_STATE_COOKIE, nonce, {
    ...cookieOptions(),
    maxAge: OAUTH_STATE_TTL_MS,
  });
}

export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, cookieOptions());
}

export function readOAuthStateCookie(req: Request | any): string | null {
  const raw = String(req?.headers?.cookie || '');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== OAUTH_STATE_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}
