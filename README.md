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
Database/       Legacy JSON archive
docs/           Architecture maps
```

## Run

```bash
npm install
npm run db:up          # optional local Postgres
npm run start          # api + web + bot (turbo)
# or separately:
npm run start:api
npm run start:web
npm run start:bot
```

Env for API + bot flags: `Apps/api/.env`  
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/BOTS.md](docs/BOTS.md).
"# MakerDash" 
