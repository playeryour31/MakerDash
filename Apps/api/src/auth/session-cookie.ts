import type { Request, Response } from 'express';

/**
 * Session transport.
 *
 * The dashboard session lives in an HttpOnly cookie so injected scripts cannot
 * read it. `JwtAuthGuard` still accepts `Authorization: Bearer` for backwards
 * compatibility (older links / API clients), but the browser no longer stores
 * the JWT in localStorage and the OAuth callback never puts it in the URL.
 */
export const SESSION_COOKIE = 'maker_session';

/** Matches the JWT lifetime configured in AuthModule (7d). */
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isSecure(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.MAKER_ENV === 'production'
  );
}

/**
 * Cookies are host-scoped (ports are ignored).
 *
 * The dashboard works out of the box when the API and the UI share a host
 * because this project proxies `/api` through Next. If the API is moved to a
 * separate hostname later (api.example.com), set SESSION_COOKIE_DOMAIN to a
 * parent domain shared by both (e.g. `.example.com`); otherwise the browser
 * sets the session on one host and never sends it to the other.
 */
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

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions(),
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

/** Minimal parser: the API does not depend on cookie-parser. */
export function readSessionCookie(req: Request | any): string | null {
  const raw = String(req?.headers?.cookie || '');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== SESSION_COOKIE) continue;
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
