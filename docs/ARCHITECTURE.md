# Architecture

```text
Apps/
  web/          Next.js dashboard (UI)           @maker/web
  api/          Nest.js API                      @maker/api
  bot/          Turbo entry → scripts/run-bot.js @maker/bot
packages/
  database/     Prisma schema + client (PostgreSQL)
  queue/        BullMQ + ioredis (@maker/queue)

Main/           Control Discord bot (bot maker)
Maker/          Customer multi-bots runtime
src/shared/     botDataClient / featureCache / platformCache / balance / blacklist
Database/       Legacy JSON archive (not SSOT; catalogs excluded below)
docker-compose.yml  PostgreSQL + Redis
```

## Data stores

| Store | Role |
|-------|------|
| **PostgreSQL (SSOT)** | BotInstance, Runtime, Apply, FeatureRecord, PlatformRecord, BotBalance, Prefix, Prices, Commands, UserBlacklist, DashboardAccess, TokenPool, ApplyAuditLog |
| **Redis + BullMQ** | Dashboard → Discord job queues (`bot.panel.*`, `bot.apply.action`, `bot.dashboard.log`) |
| **JSON catalogs only** | `Main/Resources/Commands.json`, `Main/Resources/Bots.json` (read-only import) |
| **MongoDB** | Removed |

### Runtime flags (`Apps/api/.env`)

```text
DATABASE_URL=postgresql://postgres:maker@127.0.0.1:5432/maker?schema=public
REDIS_URL=redis://127.0.0.1:6379
DATA_WRITE_MODE=postgres
DATA_READ_SOURCE=postgres
DATA_SHADOW_COMPARE=false
USE_BOT_DATA_API=true
BOT_INTERNAL_API_KEY=...
INTERNAL_API_URL=http://127.0.0.1:3011/api
BOT_TOKEN_ENCRYPTION_KEY=...
```

`scripts/run-bot.js` loads the same flags and installs the `st.db` → Postgres bridge before Main/Maker boot.

### Cutover

- Nest: provision / access / admins / security / audit → Prisma; queues → BullMQ
- Discord Main/Maker: `require('st.db')` shim routes mutable paths to Platform/Feature/typed tables
- `Subscriptions/` bot code is archived (`archive/Subscriptions/`, see `archive/README.md`);
  only `Subscriptions/Database/` stays live as legacy data (backup zip, blacklist import, `subs_*` namespaces)
- Maker: `featureDb` / `applyDb` Postgres-only; BullMQ workers deliver dashboard jobs
- Runtime/token snapshots in `Maker/index.js` are cached: runtimes follow the tick
  (`MAKER_RUNTIME_REFRESH_MS` 3s) while token rows (decrypt-heavy) refresh every
  `MAKER_TOKENS_REFRESH_MS` (60s) or immediately when a desired bot has no token
  (max once per 10s). Previously both were re-read every 3s.

### Security & operations

- **Token encryption** — bot tokens are AES-256-GCM encrypted at rest, keyed by
  `BOT_TOKEN_ENCRYPTION_KEY` (scrypt-derived, cached after first use). The key
  must be **identical** in `Apps/api/.env` and `packages/database/.env`, at least
  32 characters. There is no hard-coded fallback: outside production a missing
  key falls back to `JWT_SECRET` with a warning, in production the API and bot
  refuse to boot (`assertTokenEncryptionKey`).
- **Deployment preflight** — `npm run preflight` compares the nginx upstream,
  `WEB_PORT`, `INTERNAL_API_ORIGIN`, `PORT`, `INTERNAL_API_URL` and the two
  encryption-key copies, printing a key fingerprint (never the value).
- **Secrets** — never in the repo. Everything is read from env first
  (`src/shared/config/index.js`): `MAIN_BOT_TOKEN`, `MAIN_LOG_BOT_TOKEN`,
  `OPENAI_API_KEY`, `MAKER_WEBHOOK_TOKEN`, `MONGODB_URI`.
  Rotation runbook: [SECURITY-ROTATION.md](SECURITY-ROTATION.md).
- **Secret scan** — `npm run scan:secrets` (what git would commit) and
  `npm run scan:secrets:all` (including ignored files). A pre-commit hook is
  enabled via `git config core.hooksPath .githooks`.
- **Rate limiting** — dependency-free fixed window in
  `Apps/api/src/common/rate-limit.middleware.ts`:
  `/api` 600/min, `/api/auth` 40/min, `/api/auth/security` 12/min
  (override with `RATE_LIMIT_*` env vars). Internal/Partner routes keep their
  own limits and are skipped by the global bucket.
- **API proxy** — `/api/*` on the dashboard origin blocks `internal` and
  `partner` segments (`API_PROXY_BLOCKED_PREFIXES`) so server-to-server
  endpoints are not publicly reachable.
- **Legacy token pools** — `npm run db:import:tokens` / `:apply` understands
  every historical JSON shape; `import-phase3.ts` was fixed to use the same
  normalizer.

### DB commands

```bash
npm run db:up
npm run db:migrate
npm run db:import:phase1
npm run db:import:phase2
npm run db:import:phase3
npm run db:import:blacklist
npm run import:balances --workspace=@maker/database
```
