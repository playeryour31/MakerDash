# Bots layout

Do not confuse these names:

| Path | Role |
|------|------|
| `Main/` | **Control bot** — sells/manages bots (slash, buttons, resources) |
| `Maker/` | **Customer bots** runtime — one process, many Discord clients |
| `Apps/bot/` | Turbo/npm workspace entry only (`@maker/bot` → `scripts/run-bot.js`) |
| `Subscriptions/` | **Only `Subscriptions/Database/` remains live** (legacy data used by the backup job, blacklist import and `subs_*` platform namespaces). Its bot code was archived to `archive/Subscriptions/` — see `archive/README.md`. |

## `MAKER_ROOT` vs folder `Maker/`

- In **Nest (`Apps/api`)**: `MAKER_ROOT` means the **repo root** (where `Database/` and `Maker/` live after `chdir`).
- Folder **`Maker/`**: customer-bot code + legacy Json-Database archive.

## Boot path

```text
npm run start --workspace=@maker/bot
  → scripts/run-bot.js
  → installStDbBridge (st.db → Postgres)
  → src/maker/bootstrap.js
  → Main/ (control) + Maker/ (customers + BullMQ workers)
```

## Data plane

- Desired runtime per customer bot: Postgres `bot_runtimes` (mirrored in-memory via platform cache).
- Subscriptions / tokens: Postgres `bot_instances` (+ `tokens_mirror` hydrate).
- Dashboard → Discord work: Redis/BullMQ queues consumed in Maker.
- Read-only catalogs: `Main/Resources/Commands.json`, `Main/Resources/Bots.json` only.
