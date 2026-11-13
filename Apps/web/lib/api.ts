import { clearPersistCache } from './swrPersistCache';

const API_URL =
  typeof window !== 'undefined'
    ? '/api'
    : process.env.NEXT_PUBLIC_API_URL?.startsWith('http')
      ? process.env.NEXT_PUBLIC_API_URL
      : `${(process.env.INTERNAL_API_ORIGIN || 'http://127.0.0.1:3011').replace(/\/$/, '')}/api`;

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

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('apply_token');
}

export function setToken(token: string) {
  localStorage.setItem('apply_token', token);
}

export function clearToken() {
  localStorage.removeItem('apply_token');
  clearPersistCache();
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
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || res.statusText);
  }
  return res.json();
}
