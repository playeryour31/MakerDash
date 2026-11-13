# Security model

This document describes how MakerDash stores credentials and sessions, and which
risks are explicitly accepted. It complements
[ARCHITECTURE.md](ARCHITECTURE.md#security--operations) and
[SECURITY-ROTATION.md](SECURITY-ROTATION.md).

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Send a private report
to the repository owner with reproduction steps and affected version/commit.

## Dashboard session

| Property | Value |
|---|---|
| Transport | HttpOnly cookie `maker_session` (JavaScript cannot read it) |
| Attributes | `SameSite=Lax`, `Secure` when `NODE_ENV=production`, `Path=/`, 7 days |
| Delivery | `Set-Cookie` from the API on OAuth callback / 2FA verification |
| Logout | `POST /api/auth/logout` clears the cookie server-side |
| Legacy | `Authorization: Bearer <jwt>` is still accepted for API clients and old magic links |
| In URLs | Never. The OAuth redirect carries only `?next=` |

OAuth also uses a one-shot `maker_oauth_state` cookie (10 minutes, HttpOnly) to
bind the callback to the browser that started the flow — see
[OAuth `state`](#oauth-state).

### Same-host requirement

Cookies are scoped to a **hostname**, not a port. The supported topology is a
single host where Next proxies `/api/*` to the Nest API, so the browser receives
and sends the cookie on the same host.

If the API is moved to a separate hostname (`api.example.com`), either:

1. keep the OAuth callback on the dashboard host and proxy it, or
2. set `SESSION_COOKIE_DOMAIN=.example.com` so both hosts share the cookie.

`npm run preflight` fails when `DASHBOARD_PUBLIC_URL` and
`DISCORD_REDIRECT_URI` point at different hosts without a covering
`SESSION_COOKIE_DOMAIN`.

### OAuth `state`

`state` no longer carries the raw admin-invite or magic-link slug. `/api/auth/discord`
mints a random nonce, stores it in the HttpOnly `maker_oauth_state` cookie
(10 minutes) and sends Discord a signed envelope containing the identifier plus
that nonce. `/api/auth/discord/callback` accepts the return only when:

1. the HMAC signature matches `JWT_SECRET`,
2. the nonce equals the cookie value (same browser),
3. the envelope is younger than `OAUTH_STATE_TTL_MS`.

Failures redirect to `/?error=oauth_state_invalid`. The cookie is cleared on
every callback, so a replayed callback fails too. This closes the login-CSRF gap
while keeping the existing magic-link semantics.

Invite pages (`/a/[slug]`, `/b/[slug]`) now redirect the **browser** to
`/api/auth/discord` instead of fetching it server-side, because only the browser
can store the nonce cookie.

## Stored credentials

| Data | Storage | Encryption |
|---|---|---|
| `BotInstance.token` (bot tokens) | PostgreSQL | AES-256-GCM, `BOT_TOKEN_ENCRYPTION_KEY` |
| `TokenPoolEntry.token` (imported pools) | PostgreSQL | **Plaintext** — treat the database as a secret store |
| `JWT_SECRET` | Environment | n/a (used to sign sessions) |
| SMTP credentials | Environment | n/a |

`BOT_TOKEN_ENCRYPTION_KEY` must be identical in `Apps/api/.env` and
`packages/database/.env`, at least 32 characters, and unique per deployment.
Rotation is covered in [SECURITY-ROTATION.md](SECURITY-ROTATION.md).

Because token-pool rows are plaintext, restrict database network access, encrypt
backups, and avoid copying dumps to shared machines.

## Public surface

- Next proxies `/api/*`; `internal` and `partner` path segments are blocked at
  the proxy and return 404 (`API_PROXY_BLOCKED_PREFIXES`).
- `/api/internal/*` requires `x-bot-internal-key` and is server-to-server only.
- Rate limits: `/api` 600/min, `/api/auth` 40/min, `/api/auth/security` 12/min
  (configurable with `RATE_LIMIT_*`).
- `/api/internal/health` reports `{ ok, db }` without leaking connection
  details.

## Dependency risk (accepted, reviewed 2026-11)

`npm audit --omit=dev` currently reports **21** advisories: 0 critical, 6 high,
11 moderate, 4 low (down from 33 / 2 critical). Fixed in this pass:

- `next` 14.2.35 → **16.4.6** + React 19 (critical RCE/SSRF/DoS advisories)
- `nodemailer` 9 → **10.5.0**
- `body-parser`, `multer`, `qs`, `undici`, `canvas` pinned to patched versions
  through `overrides`

Remaining advisories and why they are deferred:

| Package | Severity | Reason |
|---|---|---|
| `@nestjs/core` / `@nestjs/platform-express` | moderate | Fix requires Nest **12** (Express 5 migration); multer/body-parser are already patched |
| `fabric` | high | Fix requires fabric **7** (breaking canvas API rewrite); the editor is browser-only and the vulnerable `canvas` was removed via override |
| `serialize-javascript` | high | No fixed version reachable from `discord-giveaways`; used on trusted giveaway objects |
| `archiver` / `zip-stream` | moderate | Fix requires archiver **8** (major); used for operator-triggered backups |
| `file-type` (inside `@nestjs/common`) | moderate | v21 is ESM-only and would break the CommonJS API |
| `prisma` / `@prisma/config` | high | Fix requires Prisma 8 (prerelease); track upstream |
| `@ducanh2912/next-pwa`, `workbox-*`, `@rollup/plugin-*` | low/moderate | No upstream fix yet; build-time only |

Re-run `npm audit --omit=dev` after every dependency change and update this
table.

## CI gates

`npm run verify` runs lint, Prettier, 73 tests, deployment preflight, secret scan
and the structural-debt ratchet. The API session path is covered by
`Apps/api/test/session-auth.test.js`: guard (cookie + legacy Bearer), cookie
attributes, `SESSION_COOKIE_DOMAIN`, logout, OAuth callback, OAuth `state`
signature/expiry/nonce binding, and 2FA verification.
