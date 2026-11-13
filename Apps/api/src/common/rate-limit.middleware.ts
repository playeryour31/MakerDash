import type { NextFunction, Request, RequestHandler, Response } from 'express';

type Bucket = { count: number; resetAt: number };

export type RateLimitOptions = {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key inside the window. */
  max: number;
  /** Namespace so different limiters do not share buckets. */
  name: string;
  /** Optional skip predicate (e.g. internal/partner APIs have their own limits). */
  skip?: (req: Request) => boolean;
  /** Optional custom key (defaults to `req.ip`). */
  key?: (req: Request) => string;
};

/**
 * Minimal dependency-free fixed-window rate limiter.
 *
 * Chosen over express-rate-limit so the API keeps working when the root
 * node_modules is not installed yet (this repo's deploy flow is `npm ci` on
 * the server). Stores counters in-process; for multi-instance deployments
 * replace the Map with Redis.
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowMs, max, name, skip, key } = options;
  const buckets = new Map<string, Bucket>();
  let lastSweep = Date.now();

  // Drop expired buckets periodically; unref so tests/CLI can exit.
  const sweep = setInterval(() => {
    const now = Date.now();
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }, Math.max(windowMs, 30_000));
  if (typeof sweep.unref === 'function') sweep.unref();

  return function rateLimiter(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (skip && skip(req)) return next();

    const id = key ? key(req) : String(req.ip || req.socket?.remoteAddress || 'unknown');
    const now = Date.now();
    const bucketKey = `${name}:${id}`;
    let bucket = buckets.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 1, resetAt: now + windowMs };
      buckets.set(bucketKey, bucket);
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - 1)));
      return next();
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Please slow down.',
        error: 'Too Many Requests',
        retryAfter,
      });
      return;
    }

    return next();
  };
}

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Limiters used by main.ts. Values are overridable from .env. */
export const apiRateLimiters = {
  /** Broad API guard: protects every endpoint from simple flooding. */
  global: createRateLimiter({
    name: 'api',
    windowMs: 60_000,
    max: envInt('RATE_LIMIT_API_PER_MIN', 600),
    skip: (req) =>
      req.path.startsWith('/internal') || req.path.startsWith('/partner'),
  }),

  /** OAuth start/callback + /auth/me. */
  auth: createRateLimiter({
    name: 'auth',
    windowMs: 60_000,
    max: envInt('RATE_LIMIT_AUTH_PER_MIN', 40),
  }),

  /** 2FA challenge / backup-code verification — strictest bucket. */
  authSecurity: createRateLimiter({
    name: 'auth-security',
    windowMs: 60_000,
    max: envInt('RATE_LIMIT_AUTH_SECURITY_PER_MIN', 12),
  }),
};
