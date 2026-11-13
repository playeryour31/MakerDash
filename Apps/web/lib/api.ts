import { clearPersistCache } from './swrPersistCache';

const API_URL =
  typeof window !== 'undefined'
    ? '/api'
    : process.env.NEXT_PUBLIC_API_URL?.startsWith('http')
      ? process.env.NEXT_PUBLIC_API_URL
      : `${(process.env.INTERNAL_API_ORIGIN || 'http://127.0.0.1:3011').replace(/\/$/, '')}/api`;

/** Legacy storage key: only used by old `?token=` magic links. */
const LEGACY_TOKEN_KEY = 'apply_token';
/** Non-sensitive flag: the HttpOnly session cookie exists. */
const SESSION_MARKER = 'apply_session';

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(body || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Legacy JWT from localStorage (kept for old links / external clients). */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LEGACY_TOKEN_KEY);
}

/**
 * True when the browser has a dashboard session.
 *
 * The real credential is an HttpOnly cookie the API sets on login, so JS
 * cannot read it. We keep a non-sensitive marker to avoid an extra request on
 * every render and to preserve the existing "logged in?" checks.
 */
export function hasSession(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(SESSION_MARKER) === '1') return true;
  return Boolean(getToken());
}

export function markSession() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_MARKER, '1');
}

/** Legacy path: store a JWT returned by an old `?token=` link. */
export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
  markSession();
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(SESSION_MARKER);
  clearPersistCache();
  // Best effort: drop the HttpOnly cookie server-side as well.
  void fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'same-origin',
  }).catch(() => undefined);
}

export function discordLoginUrl(state?: string) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  const q = params.toString();
  // Always same-origin relative so SSR href matches the client (API_URL differs on server).
  return `/api/auth/discord${q ? `?${q}` : ''}`;
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
    ...(options.headers as Record<string, string>),
  };
  // Legacy clients only; browsers authenticate with the session cookie.
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'same-origin',
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || res.statusText);
  }
  return res.json();
}
