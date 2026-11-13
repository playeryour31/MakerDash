# تدوير الأسرار وتأمين المستودع

> هذه الوثيقة تُنفّذ **مرة واحدة** بعد فحص المشروع. الهدف: إخراج كل الأسرار الحيّة
> من شجرة الملفات، وتدوير ما قد يكون انكشف، ومنع تكرار المشكلة عبر hook آلي.

## 1) الجرد: ما الذي انكشف؟

| الملف | المحتوى | العدد |
|---|---|---|
| `Database/Tokens/WorkingTokens.json` | توكنات ديسكورد نصية | **267 توكن فريد** (1,897 سجل مع تكرار) |
| `Database/Others/UnusedTokens.json` | توكنات ديسكورد نصية | 90 |
| `Database/Tokens/NonWorkingTokens.json` | توكنات + سبب الفشل | 53 |
| `Database/Tokens/Expired-Tokens.json` | توكنات منتهية | 30 |
| `Database/Others/BotMakerTokens.json` | توكنات اشتراكات | 3 |
| `Database/Tokens/ErrTokens.json` | توكنات فاشلة | 2 |
| `Main/Resources/Config.json` | توكن بوت التحكم + توكن بوت السجلات + مفتاح OpenAI (`sk-proj-…`) + DSN لماكدب مع كلمة مرور | 4 أسرار |
| `Maker/Resources/Config.json` | ويب هوك ديسكورد (`WebhookDM.Token`) | 1 |
| `.bash_history` | أسطر تحتوي token/password | 6 |

**الإجمالي ≈ 450 سرّاً فريداً.** كلها كانت قابلة للالتزام قبل تحديث `.gitignore`.

> ⚠️ إن كان المشروع قد نُسخ احتياطياً أو رُفع إلى مستودع/خادم آخر سابقاً،
> اعتبر هذه الأسرار **مكشوفة** حتى لو حُذفت الآن.

## 2) التدوير (بالترتيب)

1. **توكنات بوتات العملاء**
   - Discord Developer Portal → كل تطبيق → Bot → Reset Token.
   - أو للمالكين: حمّلها من لوحة التحكم وأعد إدخال التوكن الجديد.
   - بعد التدوير، حدّث `BotInstance.tokenEnc` (التوكنات مشفّرة AES-256-GCM عبر `BOT_TOKEN_ENCRYPTION_KEY`).
2. **بوت التحكم + بوت السجلات**
   - أعد توليد توكن `Main/Resources/Config.json › Token` و`Errors.Token`.
   - ضع الجديد في `.env` باسم `MAIN_BOT_TOKEN` و`MAIN_LOG_BOT_TOKEN`، ثم احذفهما من JSON.
3. **ويب هوك `WebhookDM`** — احذف الويب هوك من القناة وأنشئ واحداً جديداً، ثم `MAKER_WEBHOOK_TOKEN` في `.env`.
4. **مفتاح OpenAI** — Revoke من platform.openai.com → API keys، ثم `OPENAI_API_KEY` في `.env`.
5. **MongoDB** — غيّر كلمة مرور المستخدم `dr3ome990_db_user` (أو احذف المستخدم إن لم يعد Mongo مستخدماً)، وضع الـ DSN الجديد في `MONGODB_URI` فقط عند الحاجة لسكربتات الاستيراد.
6. **`JWT_SECRET`, `BOT_TOKEN_ENCRYPTION_KEY`, `PROVISION_API_KEY`, `BOT_INTERNAL_API_KEY`**
   - الموجود حالياً قوي (64 حرفاً)، لكن دوّرها إن خرجت من الخادم.
   - توليد سريع:
     ```powershell
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - ⚠️ تغيير `BOT_TOKEN_ENCRYPTION_KEY` يتطلب إعادة تشفير كل التوكنات في `bot_instances`
     (شغّل سكربت إعادة التشفير قبل الحذف، وإلا فقدت التوكنات).

## 3) بعد التدوير: تنظيف الملفات

نفّذ فقط بعد التأكد أن Postgres يحتوي التوكنات الصحيحة (`npm run db:import:tokens`).

```powershell
# 1) انسخ التوكنات القديمة إلى Postgres أولاً (dry-run ثم apply)
npm run db:import:tokens
npm run db:import:tokens:apply

# 2) تحقق من العدد داخل Postgres
#    psql: SELECT kind, count(*) FROM "TokenPoolEntry" GROUP BY kind;

# 3) عند التأكد، انقل الملفات إلى أرشيف مشفّر خارج المستودع ثم احذفها
```

> لا تحذف `Database/` قبل التأكد أن جميع البوتات تقرأ من Postgres.
> البوتات تقرأ `token_pool_*` من الذاكرة المهيّأة من PostgreSQL (`hydrateMirrors.js`)،
> وليس من ملفات JSON.

## 4) الحماية المستقبلية (مُنفَّذة في هذا المستودع)

- `.gitignore` محدّث: يمنع `.env*` و`Database/` و`Maker/Json-Database/` و`Main/Resources/Config.json`
  و`.next` و`dist` و`Backups` والأرشيفات و`.bash_history`.
- `scripts/scan-secrets.js` يكشف: توكنات ديسكورد، ويب هوك، DSN ماكدب، مفاتيح OpenAI/Google/AWS،
  المفاتيح الخاصة، وأي إسناد صريح لسر.
- pre-commit hook يمنع الالتزام عند وجود سر:
  ```powershell
  git config core.hooksPath .githooks   # تم تنفيذه
  npm run scan:secrets                  # فحص ما سيدخل المستودع
  npm run scan:secrets:all              # فحص كامل بما فيه المتجاهَل
  ```
- `src/shared/config/index.js` أصبح يقرأ الأسرار من البيئة أولاً:
  `MAIN_BOT_TOKEN`, `MAIN_LOG_BOT_TOKEN`, `OPENAI_API_KEY`, `MONGODB_URI`, `MAKER_WEBHOOK_TOKEN`.
- `.env.example` أُضيف لكل حزمة، فلا حاجة لنسخ أسرار حقيقية للبدء.

## 5) قائمة تحقق نهائية

- [ ] تدوير توكن كل بوت عميل.
- [ ] تدوير توكن بوت التحكم + بوت السجلات.
- [ ] إبطال ويب هوك `WebhookDM` وإنشاء بديل.
- [ ] إبطال مفتاح OpenAI.
- [ ] تغيير كلمة مرور MongoDB أو إيقاف Mongo.
- [ ] `npm run db:import:tokens:apply` والتحقق من الأعداد في Postgres.
- [ ] حذف `Token` / `Errors.Token` / `Errors.API` / `MongooseUrl` من `Main/Resources/Config.json`.
- [ ] حذف `Configure.WebhookDM.Token` من `Maker/Resources/Config.json`.
- [ ] حذف `Database/Tokens/*.json` و`Database/Others/*Tokens.json` بعد النسخ المشفّر.
- [ ] حذف `.bash_history`.
- [ ] `npm run scan:secrets` يعطي ✅.
