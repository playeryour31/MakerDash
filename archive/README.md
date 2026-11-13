# Archive

Code kept here is **not loaded at runtime** and is not imported by any
entrypoint. It is preserved for reference / future revival.

## `archive/Subscriptions/`

The third legacy bot family (buttons, modals, select menus, slash commands,
handlers, storage and its `index.js` loop). Nothing in the boot path loads it:

```text
scripts/run-bot.js → src/maker/bootstrap.js
  → Main/  (control bot)
  → Maker/ (customer bots)
```

It was archived during the Postgres cutover because:

- its `index.js` ran its own `setInterval` reconciliation over
  `Database/BotMaker/RunBots.json` and `Database/Others/BotMakerTokens.json`,
  duplicating what `Maker/index.js` now does against Postgres;
- it read/wrote `st.db` paths that the `st.db → Postgres` bridge already
  remaps for `Main/` and `Maker/`, so its writes would silently target the
  same namespaces with an older schema;
- it required `../Main/Resources/Config.json` relative to its own folder, which
  is why it could only run from the repo root.

### What stayed in place

`Subscriptions/Database/` **was not moved**. It is still live data:

| Consumer | Path |
|---|---|
| `Main/Events/ready.js` (backup zip) | `./Subscriptions/Database` — now skipped with a warning if the folder is absent |
| `packages/database/scripts/import-blacklist.ts` | `Subscriptions/Database/Makers/Blacklist.json` (missing file is ignored) |
| `src/shared/db/pathMap.js` | `Subscriptions/Database/**` → platform namespaces `subs_*` |

### If you ever revive this family

1. Move the folders back to `Subscriptions/`.
2. Keep `Subscriptions/Database/` as-is (do not duplicate it here).
3. Re-point the token/runtime reads at the Postgres services in
   `src/shared/services/mainDb/` instead of `st.db` JSON files.
4. Do **not** re-add a second `setInterval` manager loop — extend
   `Maker/index.js` instead, so only one process reconciles runtimes.

## Rules

- Nothing here may be `require`d from `Main/`, `Maker/`, `src/`, `Apps/` or
  `scripts/`; add a check before moving code in.
- Archived paths inside the files themselves (e.g. `./Subscriptions/Database/…`,
  `../Main/Resources/Config.json`) are intentionally **not rewritten** — they
  document how the code used to run.
