# تكامل متجر volyx.xyz ← Maker Partner API

بعد دفع العميل على **https://volyx.xyz**، باكند المتجر يستدعي Maker لإنشاء البوت + رابط الداشبورد.

**لا تستدعِ الـ API من المتصفح** — فقط من سيرفر volyx.xyz.

## عناوين الإنتاج

| | URL |
|--|-----|
| Partner API base | `https://maker.volyx.xyz/api/partner/v1` |
| Dashboard (للعميل) | `https://maker.volyx.xyz` |

## 1) إنشاء مفتاح للمتجر (مرة واحدة على سيرفر Maker)

```bash
cd /home/container
npm run partner:create-key -w @maker/api -- "Volyx Shop"
```

احفظ الناتج في أسرار متجر volyx.xyz:

```env
MAKER_API_BASE=https://maker.volyx.xyz/api/partner/v1
MAKER_KEY_ID=pk_...
MAKER_SECRET=ps_...
```

الـ secret يظهر **مرة واحدة فقط**.

## 2) التدفق

```text
عميل يدفع على volyx.xyz
        ↓
باكند volyx.xyz (بعد تأكيد الدفع)
        ↓
POST /api/partner/v1/orders  (HMAC)
        ↓
Maker ينشئ البوت + dashboardUrl + inviteUrl
        ↓
المتجر يعرض للعميل الرابطين
        ↓
العميل يفتح dashboardUrl ويسجّل دخول Discord
```

## 3) إنشاء طلب بعد الدفع

```js
// على سيرفر volyx.xyz فقط
const crypto = require('crypto');

function partnerHeaders(keyId, secret, method, bodyObj) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody =
    method === 'GET' || method === 'HEAD' ? '' : JSON.stringify(bodyObj ?? {});
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return {
    'Content-Type': 'application/json',
    'X-Maker-Key-Id': keyId,
    'X-Maker-Timestamp': timestamp,
    'X-Maker-Signature': signature,
    rawBody,
  };
}

async function provisionBotAfterPayment({
  orderId,          // رقم الطلب عندكم (فريد)
  buyerDiscordId,   // آيدي ديسكورد للمشتري
  botType,          // Protection | Ticket | System | Muslim | Apply | ...
  durationDays = 30,
  tokenMode = 'pool', // أو 'customer' + customerToken
  customerToken,
  guildId,          // إجباري — آيدي سيرفر ديسكورد (البوت مقفول عليه فقط)
}) {
  const body = {
    externalOrderId: String(orderId),
    ownerDiscordId: String(buyerDiscordId),
    botType,
    durationDays,
    tokenMode,
    guildId: String(guildId),
    ...(tokenMode === 'customer' ? { customerToken } : {}),
    language: 'Ar',
    prefix: '!',
  };

  const h = partnerHeaders(
    process.env.MAKER_KEY_ID,
    process.env.MAKER_SECRET,
    'POST',
    body,
  );

  const res = await fetch(`${process.env.MAKER_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': h['Content-Type'],
      'X-Maker-Key-Id': h['X-Maker-Key-Id'],
      'X-Maker-Timestamp': h['X-Maker-Timestamp'],
      'X-Maker-Signature': h['X-Maker-Signature'],
    },
    body: h.rawBody,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Maker provision failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  // data.dashboardUrl , data.inviteUrl , data.clientId , data.status
  return data;
}

module.exports = { provisionBotAfterPayment };
```

### أنواع البوتات الشائعة (`botType`)

`Protection` · `Ticket` · `System` · `Muslim` · `Apply` · `Giveaway` · `Log` · `TempVoice` · `TempRole` · …

قائمة كاملة: `GET https://maker.volyx.xyz/api/partner/v1/catalog`

### أوضاع التوكن

| `tokenMode` | المعنى |
|-------------|--------|
| `pool` | Maker يسحب توكن من مخزونكم |
| `customer` | العميل يرسل توكنه (`customerToken`) |

## 4) ماذا تعرض للعميل بعد النجاح

```json
{
  "status": "fulfilled",
  "clientId": "...",
  "dashboardUrl": "https://maker.volyx.xyz/b/....",
  "inviteUrl": "https://discord.com/api/oauth2/authorize?..."
}
```

- `dashboardUrl` → لوحة التحكم
- `inviteUrl` → دعوة البوت للسيرفر

نفس `externalOrderId` لو أُعيد إرساله يعيد نفس الطلب (`reused: true`) — آمن لإعادة المحاولة بعد الدفع.

## 5) أخطاء شائعة

| HTTP | السبب |
|------|--------|
| 401 | توقيع HMAC غلط أو ساعة السيرفر منحرفة |
| 400 | `ownerDiscordId` / `botType` / توكن العميل غير صالح |
| 503 | مخزون التوكنات فارغ (`tokenMode=pool`) |
| 429 | تجاوز حد الطلبات |

## 6) متطلبات على سيرفر Maker

1. مخزون توكنات (إن استخدمتم `pool`) عبر لوحة الأدمن / Token Pool  
2. `DASHBOARD_PUBLIC_URL=https://maker.volyx.xyz`  
3. البوت الأساسي شغال (`scripts/run-stack.js`) حتى يقلع بوت العميل بعد الإنشاء  

التوثيق الكامل: [PARTNER_API.md](./PARTNER_API.md)
