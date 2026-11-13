/**
 * After Main/local JSON token mutations, push the full Bots list to Nest/Postgres.
 * No-op when USE_BOT_DATA_API is off or API is unreachable (logs warning).
 */
const botDataClient = require('./botDataClient');

async function syncBotsToApi(bots) {
  if (!botDataClient.useApi()) return false;
  const list = Array.isArray(bots) ? bots : [];
  try {
    // Upsert each bot so PG stays source of truth after cutover.
    for (const bot of list) {
      if (!bot?.ClientID || !bot?.Token) continue;
      await botDataClientRequestUpsert(bot);
    }
    botDataClient.invalidateCaches();
    return true;
  } catch (err) {
    console.warn(`[tokensWriteBridge] sync failed: ${err.message}`);
    return false;
  }
}

async function botDataClientRequestUpsert(bot) {
  const fetch = (...args) =>
    import('node-fetch').then(({ default: f }) => f(...args));
  const base = (
    process.env.INTERNAL_API_URL ||
    process.env.API_URL ||
    'http://127.0.0.1:3011/api'
  ).replace(/\/$/, '');
  const key =
    process.env.BOT_INTERNAL_API_KEY || process.env.PROVISION_API_KEY || '';
  const res = await fetch(`${base}/internal/bots/upsert`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bot-internal-key': key,
    },
    body: JSON.stringify({ bot }),
    timeout: 15000,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`upsert ${res.status} ${text}`);
  }
  return res.json();
}

async function setRunningViaApi(clientId, running) {
  if (!botDataClient.useApi()) return false;
  try {
    await botDataClient.setRunning(clientId, running);
    return true;
  } catch (err) {
    console.warn(`[tokensWriteBridge] setRunning failed: ${err.message}`);
    return false;
  }
}

/** Fire-and-forget wrappers safe for sync Discord handlers. */
function syncBotsToApiBackground(bots) {
  void syncBotsToApi(bots);
}

function setRunningViaApiBackground(clientId, running) {
  void setRunningViaApi(clientId, running);
}

module.exports = {
  syncBotsToApi,
  syncBotsToApiBackground,
  setRunningViaApi,
  setRunningViaApiBackground,
};
