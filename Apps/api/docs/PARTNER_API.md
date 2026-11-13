# Maker Partner API

Secure API for an **external shop website** to provision a Maker bot + private dashboard after the customer pays on that site.

Payment stays on the external site. Maker only creates the bot environment and dashboard link.

**Production base URL:** `https://maker.volyx.xyz/api/partner/v1`  
**Shop integration (volyx.xyz):** see [VOLYX_SHOP_INTEGRATION.md](./VOLYX_SHOP_INTEGRATION.md)  
**Local base URL:** `http://127.0.0.1:3011/api/partner/v1`

> Prefer this HMAC Partner API for any external website.  
> Legacy `POST /api/internal/bots/provision` (`x-provision-key`) remains for compatibility only.

---

## Flow

1. Customer pays on your shop.
2. Your **backend** (never the browser) calls `POST /partner/v1/orders` with HMAC auth.
3. Maker validates the Discord bot token (customer-supplied **or** from Maker’s token pool).
4. Maker creates `BotInstance`, starts runtime, and issues a private dashboard slug (`/b/{slug}`).
5. Your shop shows the customer `dashboardUrl` + `inviteUrl`.
6. Customer opens `dashboardUrl` → Discord OAuth → full bot dashboard.

---

## Create partner credentials

```bash
npm run partner:create-key -w @maker/api -- "My Shop Name"
```

Output (secret shown **once**):

```text
Key ID: pk_...
Secret: ps_...
```

Store both in your shop’s secrets vault. Keys are stored encrypted in Postgres (`partner_api_keys`).

```bash
npm run db:migrate:deploy
npm run db:generate
```

---

## Authentication (HMAC)

Every request must include:

| Header | Value |
|--------|--------|
| `X-Maker-Key-Id` | Public key id (`pk_…`) |
| `X-Maker-Timestamp` | Unix time in **seconds** |
| `X-Maker-Signature` | `HMAC-SHA256(secret, timestamp + "." + rawBody)` as hex |

- Max clock skew: `PARTNER_HMAC_MAX_SKEW_SEC` (default `300`).
- For `GET` requests, `rawBody` is an empty string → sign `timestamp + "."`.
- For `POST`, sign the **exact raw JSON body** bytes (same string you send).
- Rate limit (after valid signature): `PARTNER_RATE_LIMIT_PER_MIN` (default `60`).

### Node.js signing helper

```js
const crypto = require('crypto');

function partnerHeaders(keyId, secret, method, bodyObj) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody =
    method === 'GET' || method === 'HEAD'
      ? ''
      : JSON.stringify(bodyObj ?? {});
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return {
    'Content-Type': 'application/json',
    'X-Maker-Key-Id': keyId,
    'X-Maker-Timestamp': timestamp,
    'X-Maker-Signature': signature,
    rawBody, // use this exact string as fetch body
  };
}

const API = process.env.MAKER_API_BASE || 'https://YOUR_API_HOST/api/partner/v1';
const body = {
  externalOrderId: 'shop_ord_123',
  ownerDiscordId: '123456789012345678',
  botType: 'Protection',
  durationDays: 30,
  tokenMode: 'pool',
  guildId: '111222333444555666',
};
const h = partnerHeaders(process.env.MAKER_KEY_ID, process.env.MAKER_SECRET, 'POST', body);
await fetch(`${API}/orders`, {
  method: 'POST',
  headers: {
    'Content-Type': h['Content-Type'],
    'X-Maker-Key-Id': h['X-Maker-Key-Id'],
    'X-Maker-Timestamp': h['X-Maker-Timestamp'],
    'X-Maker-Signature': h['X-Maker-Signature'],
  },
  body: h.rawBody,
});
```

### Python signing helper

```python
import hmac, hashlib, json, time, urllib.request

def partner_request(url, key_id, secret, method="GET", body=None):
    timestamp = str(int(time.time()))
    raw = "" if method in ("GET", "HEAD") or body is None else json.dumps(body)
    sig = hmac.new(secret.encode(), f"{timestamp}.{raw}".encode(), hashlib.sha256).hexdigest()
    req = urllib.request.Request(
        url,
        data=raw.encode() if raw else None,
        method=method,
        headers={
            "Content-Type": "application/json",
            "X-Maker-Key-Id": key_id,
            "X-Maker-Timestamp": timestamp,
            "X-Maker-Signature": sig,
        },
    )
    with urllib.request.urlopen(req) as res:
        return json.load(res)
```

---

## Endpoints

### `GET /partner/v1/catalog`

Scope: `catalog:read`

Lists supported bot types and token modes.

### `POST /partner/v1/orders`

Scope: `orders:write`

Creates the bot + dashboard after your shop’s payment.

**Body**

```json
{
  "externalOrderId": "shop_ord_123",
  "ownerDiscordId": "123456789012345678",
  "botType": "Protection",
  "durationDays": 30,
  "tokenMode": "pool",
  "customerToken": null,
  "guildId": "111222333444555666",
  "language": "Ar",
  "prefix": "!",
  "price": 0
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `externalOrderId` | yes | Your shop order id — **idempotent** per partner |
| `ownerDiscordId` | yes | Discord user id of the buyer (dashboard owner) |
| `botType` | yes | e.g. `Protection`, `Apply`, `Ticket`, `System`, `Muslim`, … |
| `durationDays` | no | Default `30`, max `3650` (or `PARTNER_MAX_DURATION_DAYS`) |
| `tokenMode` | yes | `pool` or `customer` |
| `customerToken` | if customer | Discord bot token owned by the customer |
| `guildId` | **yes** | Discord server ID — bot is locked to this guild only |
| `language` | no | `Ar` / `En` |
| `prefix` | no | Default `!` |
| `price` | no | Informational |

**Guild lock:** the bot may only stay in `guildId`. Joining any other server makes it leave immediately. If `Server`/`guildId` is later changed in Maker, the bot leaves the old guild and locks to the new one. `inviteUrl` always includes `guild_id` + `disable_guild_select`.

**Success response** (never includes the bot token)

```json
{
  "orderId": "clx...",
  "externalOrderId": "shop_ord_123",
  "status": "fulfilled",
  "clientId": "987654321098765432",
  "botType": "Protection",
  "tokenSource": "pool",
  "durationDays": 30,
  "dashboardSlug": "…",
  "dashboardUrl": "https://YOUR_DASHBOARD_DOMAIN/b/…",
  "inviteUrl": "https://discord.com/api/oauth2/authorize?client_id=…&permissions=8&scope=bot%20applications.commands",
  "startsAt": "…",
  "endsAt": "…",
  "reused": false
}
```

**Idempotency**

- Same `externalOrderId` + fulfilled → returns previous order (`reused: true`).
- Same id + **failed** (or stale pending) → retries provisioning.

### `GET /partner/v1/orders/:externalOrderId`

Scope: `orders:read`

Lookup order status / dashboard URLs.

---

## Error codes (common)

| HTTP | Meaning |
|------|---------|
| 400 | Invalid body (missing guildId/token, bad botType, bad snowflake) |
| 401 | Bad/missing HMAC headers or signature |
| 403 | Missing scope |
| 404 | Order not found |
| 429 | Rate limit |
| 503 | Token pool empty (`tokenMode=pool`) |

---

## Security checklist

- Call Partner API from your **shop backend only** (never from browser JS).
- Never log or return Discord bot tokens to the shop UI.
- Keep `ps_…` secret server-side only.
- Use HTTPS in production.
- Prefer unique `externalOrderId` per payment.
- Restrict partner keys (`enabled=false`) if compromised.
- Set strong `BOT_TOKEN_ENCRYPTION_KEY` and `DASHBOARD_PUBLIC_URL=https://YOUR_DASHBOARD_DOMAIN`.
- Do **not** expose `/api/internal/*` on the public internet (firewall / nginx allowlist).

---

## What the customer does next

1. Open `dashboardUrl` (`/b/{slug}`).
2. Sign in with Discord — must match `ownerDiscordId`.
3. Land on `/dashboard/{clientId}` with the full bot control panel.
4. Use `inviteUrl` to add the bot to their Discord server.

---

## Env vars

```env
NODE_ENV=production
MAKER_ENV=production
DASHBOARD_PUBLIC_URL=https://YOUR_DASHBOARD_DOMAIN
BOT_TOKEN_ENCRYPTION_KEY=<strong-random-secret>
PARTNER_HMAC_MAX_SKEW_SEC=300
PARTNER_RATE_LIMIT_PER_MIN=60
PARTNER_MAX_DURATION_DAYS=3650
PARTNER_PENDING_STALE_MS=120000
DATABASE_URL=postgresql://...
```
