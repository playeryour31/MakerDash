import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Nest API origin — read at request time (not frozen at next build). */
function apiOrigin() {
  return (
    process.env.INTERNAL_API_ORIGIN ||
    process.env.API_ORIGIN ||
    'http://127.0.0.1:3011'
  ).replace(/\/$/, '');
}

type Ctx = { params: { path?: string[] } };

/**
 * Internal and Partner APIs are server-to-server only (see
 * .env.production.checklist.md). They must never be reachable through the
 * public dashboard origin, even though both live under /api.
 * Override with API_PROXY_BLOCKED_PREFIXES if the topology changes.
 */
const BLOCKED_PREFIXES = new Set(
  (process.env.API_PROXY_BLOCKED_PREFIXES || 'internal,partner')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

async function proxy(req: NextRequest, ctx: Ctx) {
  const parts = ctx.params.path || [];
  const first = String(parts[0] || '').toLowerCase();
  if (BLOCKED_PREFIXES.has(first)) {
    // 404 (not 403) so the proxy does not confirm these routes exist.
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  const path = parts.map(encodeURIComponent).join('/');
  const search = new URL(req.url).search;
  const target = `${apiOrigin()}/api/${path}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === 'host' || k === 'connection' || k === 'content-length') return;
    headers.set(key, value);
  });

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      redirect: 'manual',
      cache: 'no-store',
      ...(hasBody
        ? ({ body: req.body, duplex: 'half' } as RequestInit)
        : {}),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        message: 'API unreachable',
        target: apiOrigin(),
        detail: String(err?.message || err),
      },
      { status: 502 },
    );
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (
      k === 'transfer-encoding' ||
      k === 'content-encoding' ||
      k === 'content-length' ||
      k === 'connection'
    ) {
      return;
    }
    out.set(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
