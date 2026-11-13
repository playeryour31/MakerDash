# Apps — الداشبورد

```text
Apps/
  web/   Next.js + Tailwind  → http://localhost:4084  (@maker/web)
  api/   Nest.js API         → http://localhost:3011/api  (@maker/api)
  bot/   تشغيل البوت عبر Turbo  (@maker/bot)
```

## تشغيل

```bash
npm run dev
# أو
npm run start
```

## تسجيل الدخول (Discord OAuth)

1. أنشئ تطبيقًا في [Discord Developer Portal](https://discord.com/developers/applications)
2. OAuth2 → Redirects أضف:
   `http://localhost:3011/api/auth/discord/callback`
3. انسخ Client ID / Secret إلى `Apps/api/.env`:

```env
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=http://localhost:3011/api/auth/discord/callback
DASHBOARD_PUBLIC_URL=http://localhost:4084
```

### التدفق

1. شراء بوت من Discord → DM فيه رابط `/b/{slug}`
2. فتح الرابط → تسجيل دخول Discord
3. يجب أن يطابق الحساب مشتري البوت (`ownerId`)
4. التحويل إلى `/dashboard/{clientId}`
5. الصفحة الرئيسية `/dashboard` تعرض كل بوتات الحساب عبر `GET /api/bots/mine`

### مسارات Auth

```http
GET  /api/auth/discord?state={slug?}
GET  /api/auth/discord/callback
GET  /api/auth/me
GET  /api/bots/mine
```

## Partner API (متاجر خارجية)

بعد دفع العميل في موقعك، استدعِ Maker من **باكند المتجر فقط** (ليس من المتصفح):

- التوثيق الكامل: [`api/docs/PARTNER_API.md`](./api/docs/PARTNER_API.md)
- قائمة إنتاج: [`.env.production.checklist.md`](../.env.production.checklist.md)
- إنشاء مفتاح: `npm run partner:create-key -w @maker/api -- "Shop Name"`
- Base URL إنتاج: `https://YOUR_API_HOST/api/partner/v1`

```http
GET  /api/partner/v1/catalog
GET  /api/partner/v1/orders/:externalOrderId
POST /api/partner/v1/orders
Headers: X-Maker-Key-Id, X-Maker-Timestamp, X-Maker-Signature
```

المسار القديم (للتوافق فقط — فضّل Partner HMAC):

```http
POST /api/internal/bots/provision
Header: x-provision-key: <PROVISION_API_KEY>
```

في الإنتاج: عيّن `DASHBOARD_PUBLIC_URL` و`NODE_ENV=production`، ولا تعرض `/api/internal/*` للعامة.
