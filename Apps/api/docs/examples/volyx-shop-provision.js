/**
 * Example helper for volyx.xyz shop backend → Maker Partner API.
 * Copy into the shop server; do NOT run in the browser.
 *
 * Env:
 *   MAKER_API_BASE=https://maker.volyx.xyz/api/partner/v1
 *   MAKER_KEY_ID=pk_...
 *   MAKER_SECRET=ps_...
 */
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

/**
 * Call after successful payment on volyx.xyz.
 * @returns {Promise<object>} Maker order payload (dashboardUrl, inviteUrl, ...)
 */
async function provisionBotAfterPayment(input) {
  const base = (process.env.MAKER_API_BASE || '').replace(/\/$/, '');
  const keyId = process.env.MAKER_KEY_ID;
  const secret = process.env.MAKER_SECRET;
  if (!base || !keyId || !secret) {
    throw new Error('MAKER_API_BASE / MAKER_KEY_ID / MAKER_SECRET are required');
  }

  const body = {
    externalOrderId: String(input.orderId),
    ownerDiscordId: String(input.buyerDiscordId),
    botType: String(input.botType),
    durationDays: Number(input.durationDays || 30),
    tokenMode: input.tokenMode === 'customer' ? 'customer' : 'pool',
    guildId: String(input.guildId || ''),
    language: input.language || 'Ar',
    prefix: input.prefix || '!',
  };
  if (body.tokenMode === 'customer') {
    body.customerToken = String(input.customerToken || '');
  }
  if (input.price != null) body.price = Number(input.price);

  const h = partnerHeaders(keyId, secret, 'POST', body);
  const res = await fetch(`${base}/orders`, {
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
    const err = new Error(
      data.message || data.error || `Maker provision failed (${res.status})`,
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

module.exports = { provisionBotAfterPayment, partnerHeaders };
