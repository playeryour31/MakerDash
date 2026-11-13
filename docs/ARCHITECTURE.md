# Architecture

## Runtime processes

Three processes share one PostgreSQL database. Nothing else is shared.

```text
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Apps/web       │   │   Apps/api       │   │   bot process    │
│   Next.js :4084  │──▶│   NestJS :3011   │   │   Main + Maker   │
│   (browser)      │   │   (HTTP + BullMQ │   │   (Discord.js)   │
│                  │   │    producer)     │   │   + BullMQ worker│
└──────────────────┘   └──────────────────┘   └──────────────────┘
        │                      │                       │
        └──────────┬───────────┴───────────┬───────────┘
                   ▼                       ▼
            PostgreSQL :5432          Redis :6379
            (Prisma, SSOT)            (cache + queues)
```

| Process | Entry point | Notes |
|---------|-------------|-------|
| Web | `Apps/web` (`next` standalone) | Dashboard UI only; never touches the DB |
| API | `Apps/api/src/main.ts` | Owns auth, provisioning, apply, protection, partner APIs |
| Bot | `scripts/run-bot.js` → `src/maker/bootstrap.js` | Runs the control bot (`Main/`) and every customer bot (`Maker/`) in one Node process |

`Main/index.js` is a one-line re-export of `src/maker/bootstrap.js`; the real
control-bot code still lives in `Main/`.

## Directory map

```text
Apps/
  web/          Next.js dashboard                    @maker/web
  api/          NestJS API                           @maker/api
  bot/          Turbo entry → scripts/run-bot.js      @maker/bot
packages/
  database/     Prisma schema, client, token crypto   @maker/database
  queue/        BullMQ producer/worker + Redis        @maker/queue
  subscriptions/(phase 1) pure subscription rules     @maker/subscriptions
Main/           Control Discord bot handlers (legacy JS)
Maker/          Customer multi-bot runtime (legacy JS)
src/shared/     Bridges between legacy JS and Postgres/Redis
src/maker/      Bootstrap, client factory, keep-alive
Database/       Legacy JSON archive (see "Known debt")
Maker/Json-Database/  Legacy JSON archive (see "Known debt")
archive/        Dead code kept for reference, never required at runtime
```

## Data ownership

Each fact has exactly one owner. Everything else reads through a typed service.

| Fact | Owner | Readers |
|------|-------|---------|
| Bot identity, token (encrypted), owner, guild | `BotInstance` | API repositories, `src/shared/services/mainDb/botsService.js` |
| Running state | `BotRuntime` | `runtimeService`, `Maker/index.js` reconcile loop |
| Prefix / prices / command config | `BotPrefix`, `GuildBotPrice`, `BotCommandConfig` | `mainDb/*Service` |
| Apply panels & applications | `ApplyPanel`, `ApplyApplication`, `ApplyGuildSettings` | `ApplyStoreService` *(still dual-writes JSON — see debt)* |
| Dashboard access, admins | `DashboardAccess` | `dashboard-access.service.ts` |
| Balances | `BotBalance` | `balanceService.js` |
| Blacklist | `UserBlacklist` | `blacklistService.js` |
| Token pools | `TokenPoolEntry` | `tokenPoolService.js` |
| Feature settings (tickets, protection, azkar, quran…) | `FeatureRecord` | `featureCache` |
| Loose KV mirrors | `PlatformRecord` | `platformCache` |
| Catalogs (`Main/Resources/*.json`) | filesystem, read-only | `staticCatalog` |

### Two bridges, one job

The legacy Discord code calls `new Database(path)` hundreds of times (296
call sites, 54 distinct paths). Two `st.db`-compatible shims keep those calls
working without touching 40k lines of bot code:

| Bridge | Used by | Backing store |
|--------|---------|---------------|
| `src/shared/db/pgDatabase.js` | Customer bots, via `installStDbBridge()` `Module._load` patch | `platformCache` + `featureCache` |
| `src/shared/services/mainDb/Database.js` | Control bot (`Main/`) | Same caches, explicit imports |

`src/shared/db/pathMap.js` is the single routing table mapping a legacy path to
`catalog`, a `FeatureRecord` namespace, a typed table, or a `PlatformRecord`
mirror. Both bridges share it, so a path resolves the same way regardless of
caller.

**Phase 2 merges these two bridges into `packages/data-bridge`.**

## Runtime flags

Set in `Apps/api/.env`; the bot process loads the same file (`scripts/run-bot.js`).

```text
DATABASE_URL=postgresql://...
REDIS_URL=redis://127.0.0.1:6379
DATA_WRITE_MODE=postgres      # postgres | dual | json
DATA_READ_SOURCE=postgres     # postgres | json
DATA_SHADOW_COMPARE=false
USE_BOT_DATA_API=true
BOT_INTERNAL_API_KEY=...
INTERNAL_API_URL=http://127.0.0.1:3011/api
BOT_TOKEN_ENCRYPTION_KEY=...
```

`DataConsistencyService` reports JSON↔Postgres mismatches when shadow compare
is on. `npm run metrics` prints the coupling that these flags exist to remove.

## Security & operations

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
  `OPENAI_API_KEY`, `MAKER_WEBHOOK_TOKEN`.
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

## Quality gates

```bash
npm run verify        # lint + format:check + test + preflight + scan:secrets + metrics
npm run metrics       # the structural debt scoreboard (read-only)
npm run metrics:baseline   # fails if any measured number regressed
```

`scripts/metrics.baseline.json` is the ratchet. When a phase improves a number,
re-run `node scripts/metrics.js --write-baseline` and commit the new baseline —
the diff of that file *is* the progress report.

ESLint is deliberately asymmetric: `Apps/**` and `packages/**` get strict rules,
`Main/` and `Maker/` get bug-catching rules only. Prettier owns
`scripts/**` and `packages/**`; the legacy and dashboard trees are formatted
file-by-file as they are touched, so real changes stay visible in review.

## Known debt (measured, not estimated)

Produced by `npm run metrics`:

| Metric | Value | Target |
|--------|-------|--------|
| `new Database()` call sites | 302 | 0 outside the bridge |
| Distinct legacy paths | 54 | routed via one table |
| `setInterval` calls | 34 | ≤ 8 |
| `console.*` calls | 644 | one structured logger |
| `createRequire()` in API | 2 | 0 |
| `requireFromHere()` in API | 5 | 0 |
| Direct `fs` use in API | 30 | 0 |
| Legacy JSON on disk | 10.0 MB | 0 |
| Largest file | `Maker/Events/ready.js` 1,362 lines | < 400 |

Subscription policy is implemented three times (`subscriptionLifecycle.js`,
`subscription-status.service.ts`, and a commented block in `Main/Events/ready.js`).
Phase 1 collapses these into `@maker/subscriptions`.

## DB commands

```bash
npm run db:up
npm run db:migrate
npm run db:import:phase1
npm run db:import:phase2
npm run db:import:phase3
npm run db:import:blacklist
npm run import:balances --workspace=@maker/database
```
