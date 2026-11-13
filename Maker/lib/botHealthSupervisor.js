/**
 * Periodic health layer for Maker-created customer bots.
 * - Ensures every *active* Tokens bot has a BotInstance + BotRuntime row in Postgres
 * - Never resurrects grace / expired / purged subscriptions (that caused purge loops + DM spam)
 * - Reports Discord live vs desired state (manager handles reconnect)
 */

const fs = require('fs');
const path = require('path');

const HEALTH_INTERVAL_MS = Math.max(
  15_000,
  Number(process.env.BOT_HEALTH_INTERVAL_MS) || 45_000,
);
const FORCE_GRACE_MS = Math.max(
  20_000,
  Number(process.env.BOT_HEALTH_FORCE_GRACE_MS) || 45_000,
);

const ROOT = path.resolve(__dirname, '..', '..');

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) || fallback;
  } catch {
    return fallback;
  }
}

function writeJsonSafe(filePath, payload) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    console.warn(`[bot-health] write ${filePath}: ${err.message}`);
  }
}

function tokensPath() {
  return path.join(ROOT, 'Database', 'Others', 'Tokens.json');
}

function runBotsPath() {
  return path.join(ROOT, 'Database', 'BotMaker', 'RunBots.json');
}

function loadJsonTokens() {
  const raw = readJsonSafe(tokensPath(), {});
  return Array.isArray(raw.Bots) ? raw.Bots : [];
}

function loadJsonRuntime() {
  const raw = readJsonSafe(runBotsPath(), {});
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    out[String(k)] = Boolean(v);
  }
  return out;
}

function isConnected(client) {
  try {
    if (!client) return false;
    if (typeof client.isReady === 'function' && client.isReady()) return true;
    return Boolean(client.user && client.readyTimestamp);
  } catch {
    return false;
  }
}

function isGraceOrExpired(clientId, tokenRow) {
  try {
    const {
      isBotBlockedFromLogin,
      getGraceSnapshot,
      phaseForEndTime,
    } = require('../../src/shared/services/subscriptionLifecycle');
    const { Database } = require('../../src/shared/services/mainDb');
    const expiredDb = new Database('/Database/Others/Expired.json');
    if (getGraceSnapshot(expiredDb, clientId)) return true;
    if (expiredDb.get(`Expired_${clientId}`)) return true;
    if (tokenRow && isBotBlockedFromLogin(tokenRow)) return true;
    const end =
      tokenRow?.endTime ||
      tokenRow?.endsAt ||
      tokenRow?.EndTime ||
      null;
    const phase = phaseForEndTime(end);
    if (phase === 'grace' || phase === 'purge') return true;
    return false;
  } catch {
    return false;
  }
}

/** PG fallback when platformCache is not hydrated yet. */
async function isPurgedInPostgres(prisma, clientId) {
  try {
    const row = await prisma.platformRecord.findFirst({
      where: {
        namespace: 'expired',
        key: `Expired_${String(clientId)}`,
      },
      select: { id: true },
    });
    return Boolean(row);
  } catch {
    return false;
  }
}

async function ensureInstancesFromTokens(prisma, encryptBotToken, bots) {
  let healed = 0;
  for (const bot of bots) {
    const clientId = String(bot.ClientID || bot.clientId || '');
    const plain = String(bot.Token || bot.token || '');
    if (!clientId || !plain) continue;

    // Never resurrect purged / grace / expired subscriptions from stale Tokens.json
    if (isGraceOrExpired(clientId, bot)) continue;
    if (await isPurgedInPostgres(prisma, clientId)) continue;

    const existing = await prisma.botInstance.findUnique({
      where: { clientId },
      select: { clientId: true },
    });
    if (existing) continue;

    let tokenEnc;
    try {
      tokenEnc = encryptBotToken(plain);
    } catch {
      tokenEnc = plain;
    }

    const allowed = new Set([
      'Apply',
      'Muslim',
      'Autoline',
      'Feedback',
      'Giveaway',
      'Log',
      'Offer',
      'Package',
      'Protection',
      'Selfrole',
      'Stock',
      'Suggestion',
      'System',
      'Tax',
      'Ticket',
      'TempRole',
      'TempVoice',
    ]);
    const typeRaw = String(bot.Type || 'System');
    const type =
      typeRaw === 'Azkar'
        ? 'Muslim'
        : allowed.has(typeRaw)
          ? typeRaw
          : 'System';

    const parseDate = (value) => {
      if (!value) return null;
      const d = new Date(String(value).replace(' ', 'T'));
      return Number.isNaN(d.getTime()) ? null : d;
    };

    try {
      await prisma.botInstance.create({
        data: {
          clientId,
          tokenEnc,
          ownerId: String(bot.Owner || ''),
          buyerId: bot.Buyer ? String(bot.Buyer) : null,
          sellerId: bot.Seller ? String(bot.Seller) : null,
          botNumber: bot.BotID ?? null,
          type,
          guildId: bot.guild ? String(bot.guild) : null,
          serverId: bot.Server ? String(bot.Server) : null,
          servers: Array.isArray(bot.Servers)
            ? bot.Servers.map(String)
            : bot.Server
              ? [String(bot.Server)]
              : [],
          price: bot.Price ?? null,
          node: bot.Node ?? null,
          purchasesId: bot.PurchasesID ?? null,
          tokenType: bot.TokenType ? String(bot.TokenType) : null,
          dashboardSlug: bot.dashboardSlug ? String(bot.dashboardSlug) : null,
          startsAt: parseDate(bot.startTime),
          endsAt: parseDate(bot.endTime),
          language: bot.language === 'En' ? 'En' : 'Ar',
        },
      });
      healed += 1;
      console.log(
        `[bot-health] created missing BotInstance ${clientId} (${type})`,
      );
    } catch (err) {
      console.warn(
        `[bot-health] failed to create BotInstance ${clientId}: ${err.message}`,
      );
    }
  }
  return healed;
}

async function syncRuntimeRows(prisma, tokenIds, jsonRuntime, botsById) {
  let synced = 0;
  for (const clientId of tokenIds) {
    const rowBot = botsById.get(clientId);
    if (isGraceOrExpired(clientId, rowBot)) continue;
    if (await isPurgedInPostgres(prisma, clientId)) continue;

    const desired = Boolean(jsonRuntime[clientId]);
    const row = await prisma.botRuntime.findUnique({
      where: { clientId },
      select: { running: true },
    });
    if (row && Boolean(row.running) === desired) continue;
    // Only fill missing PG rows from JSON — don't fight intentional PG false
    if (row) continue;

    const instance = await prisma.botInstance.findUnique({
      where: { clientId },
      select: { clientId: true },
    });
    if (!instance) continue;

    try {
      await prisma.botRuntime.create({
        data: { clientId, running: desired },
      });
      synced += 1;
      console.log(
        `[bot-health] created missing BotRuntime ${clientId}=${desired}`,
      );
    } catch (err) {
      console.warn(
        `[bot-health] BotRuntime create skipped for ${clientId}: ${err.message}`,
      );
    }
  }
  return synced;
}

function reportLiveHealth(tokenIds, jsonRuntime, pgRuntime, botsById) {
  const issues = [];
  for (const clientId of tokenIds) {
    if (isGraceOrExpired(clientId, botsById.get(clientId))) continue;
    const desired =
      pgRuntime[clientId] !== undefined
        ? Boolean(pgRuntime[clientId])
        : Boolean(jsonRuntime[clientId]);
    if (!desired) continue;
    const live = isConnected(global.bots?.[clientId]);
    if (!live) {
      issues.push(clientId);
    } else {
      global.botNotReadySince?.delete(clientId);
    }
  }
  if (issues.length) {
    console.warn(
      `[bot-health] desired-on but Discord not ready (${issues.length}): ${issues.join(', ')}`,
    );
  }
  return issues;
}

function resolveBotToken(clientId, tokenRow) {
  const live = global.bots?.[clientId];
  return (
    live?.makerToken ||
    live?.token ||
    tokenRow?.Token ||
    tokenRow?.token ||
    null
  );
}

function shouldForceReconnect(clientId, tokenRow) {
  const token = resolveBotToken(clientId, tokenRow);
  if (token && global.loggingInTokens?.has(token)) return false;

  if (!global.botNotReadySince) global.botNotReadySince = new Map();
  const now = Date.now();
  if (!global.botNotReadySince.has(clientId)) {
    global.botNotReadySince.set(clientId, now);
    return false;
  }
  return now - global.botNotReadySince.get(clientId) >= FORCE_GRACE_MS;
}

/** Drop stale expired bots from Tokens.json / RunBots.json so they stop being healed. */
function scrubExpiredFromDisk(jsonBots, jsonRuntime) {
  let botsChanged = false;
  let runChanged = false;
  const kept = [];
  for (const bot of jsonBots) {
    const id = String(bot.ClientID || bot.clientId || '');
    if (!id) continue;
    if (isGraceOrExpired(id, bot)) {
      botsChanged = true;
      if (jsonRuntime[id]) {
        jsonRuntime[id] = false;
        runChanged = true;
      }
      continue;
    }
    kept.push(bot);
  }
  if (botsChanged) {
    writeJsonSafe(tokensPath(), { Bots: kept });
    console.log(
      `[bot-health] scrubbed ${jsonBots.length - kept.length} expired bot(s) from Tokens.json`,
    );
  }
  if (runChanged) {
    writeJsonSafe(runBotsPath(), jsonRuntime);
  }
  return kept;
}

let healthTickRunning = false;
let forceReconnectFn = null;
let lastMainNotReadyLog = 0;

async function runHealthTick() {
  if (healthTickRunning) return;
  healthTickRunning = true;
  try {
    const { prisma, encryptBotToken } = require('@maker/database');
    let jsonBots = loadJsonTokens();
    const jsonRuntime = loadJsonRuntime();
    jsonBots = scrubExpiredFromDisk(jsonBots, jsonRuntime);

    const tokenIds = jsonBots
      .map((b) => String(b.ClientID || b.clientId || ''))
      .filter(Boolean);
    const botsById = new Map(
      jsonBots.map((b) => [String(b.ClientID || b.clientId || ''), b]),
    );

    await ensureInstancesFromTokens(prisma, encryptBotToken, jsonBots);

    try {
      const { bots } = require('../../src/shared/services/mainDb');
      await bots.listBots(true);
    } catch (err) {
      console.warn(`[bot-health] tokens mirror refresh failed: ${err.message}`);
    }

    const pgRows = await prisma.botRuntime.findMany();
    const pgRuntime = {};
    for (const r of pgRows) pgRuntime[r.clientId] = r.running;

    await syncRuntimeRows(prisma, tokenIds, jsonRuntime, botsById);
    const issues = reportLiveHealth(
      tokenIds,
      jsonRuntime,
      pgRuntime,
      botsById,
    );

    if (typeof forceReconnectFn === 'function' && issues.length) {
      for (const clientId of issues) {
        const row = botsById.get(clientId);
        if (isGraceOrExpired(clientId, row)) continue;
        if (!shouldForceReconnect(clientId, row)) continue;
        try {
          console.warn(`[bot-health] forcing reconnect for ${clientId}`);
          await forceReconnectFn(clientId);
          global.botNotReadySince?.delete(clientId);
        } catch (err) {
          console.warn(
            `[bot-health] force reconnect failed ${clientId}: ${err.message}`,
          );
        }
      }
    }

    try {
      const main = global.mainBot;
      let live = false;
      try {
        live = require('../../src/maker/client/keepAlive').isClientLive(main);
      } catch {
        live = isConnected(main);
      }
      if (main && !live) {
        const now = Date.now();
        if (now - lastMainNotReadyLog > 60_000) {
          lastMainNotReadyLog = now;
          console.warn(
            '[bot-health] Main bot not ready — keepAlive should reconnect',
          );
        }
        global.mainBotKeepAlive?.scheduleReconnect?.('health-tick');
      }
    } catch {
      /* ignore */
    }
  } catch (err) {
    console.warn(`[bot-health] tick failed: ${err.message}`);
  } finally {
    healthTickRunning = false;
  }
}

function startBotHealthSupervisor(opts = {}) {
  forceReconnectFn = opts.forceCustomerReconnect || null;
  console.log(
    `[bot-health] supervisor started (every ${Math.round(HEALTH_INTERVAL_MS / 1000)}s)`,
  );
  setTimeout(() => {
    void runHealthTick();
  }, 15_000);
  setInterval(() => {
    void runHealthTick();
  }, HEALTH_INTERVAL_MS);
  return { runHealthTick };
}

module.exports = {
  startBotHealthSupervisor,
  runHealthTick,
  isConnected,
};
