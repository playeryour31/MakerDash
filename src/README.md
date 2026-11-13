# Maker source layout

```text
src/
  shared/     loaders, utils, config, db, services, schemas
  maker/      control-bot bootstrap + client factory
  bots/       helpers for customer multi-bot runtime

Apps/         dashboard monorepo packages — see Apps/README.md
  web/        Next.js (@maker/web)
  api/        NestJS  (@maker/api)
  bot/        Discord entry via scripts/run-bot.js (@maker/bot)

data/         path accessors for Database / Bot Json-Database
```

Runtime Discord command trees live under `Main/` and `Maker/` and are loaded through `src/shared/loaders` / bootstrap.
