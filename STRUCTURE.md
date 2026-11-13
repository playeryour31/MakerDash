# هيكل المشروع

انظر الخريطة الموحّدة: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) و [docs/BOTS.md](docs/BOTS.md).

```text
Apps/
  web/          Next.js dashboard          @maker/web
  api/          Nest.js API                @maker/api
  bot/          دخول تشغيل البوت (Turbo)   @maker/bot
packages/
  database/     Prisma + PostgreSQL

Main/           البوت الأساسي (صانع البوتات)
Maker/          بوتات العملاء + Json-Database
src/shared/     أدوات مشتركة
Database/       JSON أرشيف
```

أعلام التشغيل: `Apps/api/.env` (يحمّلها أيضاً `scripts/run-bot.js`).
