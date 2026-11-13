# Maker

Monorepo: Discord bots + dashboard (Next) + API (Nest) + PostgreSQL.

## Tree

```text
Apps/
  web/          Next.js dashboard          → @maker/web   :4084
  api/          NestJS API                 → @maker/api   :3011
  bot/          Turbo entry for Discord    → @maker/bot
packages/
  database/     Prisma / PostgreSQL        → @maker/database
Main/           Control bot (bot maker)
Maker/          Customer bots + Json-Database (archive / fallback)
src/            Bootstrap + shared services
docs/           Architecture maps
Database/       Legacy JSON archive — git-ignored, exists on old servers only
```

## Run

Requires Node **20.17+** (see `.nvmrc`), PostgreSQL and (optionally) Redis.

```bash
npm install
cp Apps/api/.env.example Apps/api/.env               # then fill in the secrets
cp packages/database/.env.example packages/database/.env   # same BOT_TOKEN_ENCRYPTION_KEY
npm run db:up          # optional local Postgres + Redis
npm run db:migrate:deploy

npm run dev            # builds workspace packages, then api + web + bot
npm run build && npm run start   # production (api + web + bot via turbo)
# or separately:
npm run start:api
npm run start:web
npm run start:bot
```

`npm run verify` runs the full local gate (lint, format, tests, preflight,
secret scan, structural metrics).

Env for API + bot flags: `Apps/api/.env`  
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/BOTS.md](docs/BOTS.md).
