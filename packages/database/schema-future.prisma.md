# Prisma models — status

Phase 1 + Phase 2+ models live in `prisma/schema.prisma`.

## Shipped

| Model | Role |
|-------|------|
| `BotInstance` / `BotRuntime` / Apply* / `BotJob` | Phase 1 SSOT |
| `FeatureRecord` | Maker Settings/Systems KV |
| `PlatformRecord` | Database/* platform KV |
| `BotBalance` | Economy (from Mongo) |
| `BotPrefix` / `GuildBotPrice` / `BotCommandConfig` | Commands dashboard |

## Still Mongo (by design)

- ApplyAudit / dashboard activity logs
- Sessions / account security extras
- Blacklist

## Optional later (normalize KV → relational)

Only if a feature needs strong querying:

- Ticket panels/threads as first-class tables
- Giveaway + entries
- Protection rules + whitelist

Until then, `FeatureRecord` is the intentional pragmatic store.
