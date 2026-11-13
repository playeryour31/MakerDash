/**
 * Main-bot data layer — PostgreSQL via Prisma + hydrated caches.
 * Drop-in Database(path) API (st.db-compatible) without requiring st.db.
 */
const { resolveStore } = require('../../db/pathMap');
const platformCache = require('../platformCache');
const { prisma, encryptBotToken, decryptBotToken } = require('@maker/database');

function formatBotDate(d) {
  if (!d) return undefined;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return undefined;
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

function parseBotDate(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toBotType(raw) {
  const key = String(raw || 'System');
  if (key === 'Azkar') return 'Muslim';
  const allowed = [
    'Apply',
    'Azkar',
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
  ];
  return allowed.includes(key) ? key : 'System';
}

function rowToLegacy(row, includeToken = true) {
  let token;
  if (includeToken) {
    try {
      token = decryptBotToken(row.tokenEnc);
    } catch {
      token = row.tokenEnc || '';
    }
  }
  return {
    Token: token,
    Owner: row.ownerId,
    Buyer: row.buyerId || row.ownerId,
    Seller: row.sellerId || undefined,
    ClientID: row.clientId,
    BotID: row.botNumber ?? undefined,
    Type: row.type,
    Servers: row.servers || [],
    Server: row.serverId || row.guildId || undefined,
    guild: row.guildId || row.serverId || undefined,
    Price: row.price ?? undefined,
    Node: row.node ?? undefined,
    PurchasesID: row.purchasesId ?? undefined,
    endTime: formatBotDate(row.endsAt),
    startTime: formatBotDate(row.startsAt),
    TokenType: row.tokenType || undefined,
    dashboardSlug: row.dashboardSlug || undefined,
    language: row.language,
    warnedBefore: row.meta?.warnedBefore,
    graceUntil: row.meta?.graceUntil || undefined,
    status: row.meta?.status || undefined,
  };
}

async function listBots(includeToken = true) {
  const rows = await prisma.botInstance.findMany({ orderBy: { createdAt: 'asc' } });
  const list = rows.map((r) => rowToLegacy(r, includeToken));
  platformCache.createPlatformDb('tokens_mirror').set('Bots', list);
  return list;
}

function listBotsSync() {
  const mirror = platformCache.createPlatformDb('tokens_mirror');
  const bots = mirror.get('Bots');
  return Array.isArray(bots) ? bots : [];
}

async function setAllBots(bots) {
  const list = Array.isArray(bots) ? bots : [];
  platformCache.createPlatformDb('tokens_mirror').set('Bots', list);

  const existing = await prisma.botInstance.findMany({ select: { clientId: true } });
  const keep = new Set(
    list.map((b) => String(b.ClientID || b.clientId || '')).filter(Boolean),
  );
  for (const row of existing) {
    if (!keep.has(row.clientId)) {
      await prisma.botInstance
        .delete({ where: { clientId: row.clientId } })
        .catch(() => {});
    }
  }

  for (const bot of list) {
    const clientId = String(bot.ClientID || bot.clientId || '');
    if (!clientId) continue;
    const plain = String(bot.Token || bot.token || '');
    if (!plain) continue;
    let tokenEnc;
    try {
      tokenEnc = encryptBotToken(plain);
    } catch {
      tokenEnc = plain;
    }
    const meta =
      bot.warnedBefore != null || bot.meta
        ? {
            ...(typeof bot.meta === 'object' && bot.meta ? bot.meta : {}),
            ...(bot.warnedBefore != null
              ? { warnedBefore: Boolean(bot.warnedBefore) }
              : {}),
          }
        : undefined;
    await prisma.botInstance.upsert({
      where: { clientId },
      create: {
        clientId,
        tokenEnc,
        ownerId: String(bot.Owner || bot.Buyer || ''),
        buyerId: bot.Buyer ? String(bot.Buyer) : null,
        sellerId: bot.Seller ? String(bot.Seller) : null,
        botNumber: bot.BotID != null ? Number(bot.BotID) : null,
        type: toBotType(bot.Type),
        servers: Array.isArray(bot.Servers) ? bot.Servers.map(String) : [],
        serverId: bot.Server ? String(bot.Server) : null,
        guildId: bot.guild || bot.Server ? String(bot.guild || bot.Server) : null,
        price: bot.Price != null ? Number(bot.Price) : null,
        node: bot.Node != null ? Number(bot.Node) : null,
        purchasesId: bot.PurchasesID != null ? Number(bot.PurchasesID) : null,
        tokenType: bot.TokenType ? String(bot.TokenType) : null,
        dashboardSlug: bot.dashboardSlug || null,
        startsAt: parseBotDate(bot.startTime),
        endsAt: parseBotDate(bot.endTime),
        language: bot.language === 'En' ? 'En' : 'Ar',
        ...(meta ? { meta } : {}),
      },
      update: {
        tokenEnc,
        ownerId: String(bot.Owner || bot.Buyer || ''),
        buyerId: bot.Buyer ? String(bot.Buyer) : null,
        sellerId: bot.Seller ? String(bot.Seller) : null,
        botNumber: bot.BotID != null ? Number(bot.BotID) : null,
        type: toBotType(bot.Type),
        servers: Array.isArray(bot.Servers) ? bot.Servers.map(String) : [],
        serverId: bot.Server ? String(bot.Server) : null,
        guildId: bot.guild || bot.Server ? String(bot.guild || bot.Server) : null,
        price: bot.Price != null ? Number(bot.Price) : null,
        purchasesId: bot.PurchasesID != null ? Number(bot.PurchasesID) : null,
        tokenType: bot.TokenType ? String(bot.TokenType) : null,
        startsAt: parseBotDate(bot.startTime),
        endsAt: parseBotDate(bot.endTime),
        language: bot.language === 'En' ? 'En' : 'Ar',
        ...(meta ? { meta } : {}),
      },
    });
  }
  return list;
}

function setAllBotsSync(bots) {
  const list = Array.isArray(bots) ? bots : [];
  platformCache.createPlatformDb('tokens_mirror').set('Bots', list);
  void setAllBots(list);
  return list;
}

async function deleteBotData(clientId) {
  const id = String(clientId);
  await prisma.botRuntime.deleteMany({ where: { clientId: id } });
  await prisma.botPrefix.deleteMany({ where: { clientId: id } });
  await prisma.botCommandConfig.deleteMany({ where: { clientId: id } });
  await prisma.featureRecord.deleteMany({ where: { botClientId: id } });
  await prisma.botInstance.deleteMany({ where: { clientId: id } });
  // Purge platform KV rows whose key embeds this client id (legacy JSON wipe behavior)
  // Never wipe namespace `expired` — Expired_* is the permanent purge marker for bot-health
  await prisma.platformRecord.deleteMany({
    where: {
      AND: [
        {
          OR: [
            { namespace: 'owner_data', key: `Owner_${id}` },
            { namespace: 'language', key: id },
            { key: { contains: id } },
          ],
        },
        { NOT: { namespace: 'expired' } },
      ],
    },
  });
  try {
    await prisma.dashboardAccess.deleteMany({ where: { clientId: id } });
  } catch {
    /* optional if table missing in older envs */
  }
  const bots = listBotsSync().filter((b) => String(b.ClientID) !== id);
  platformCache.createPlatformDb('tokens_mirror').set('Bots', bots);
  platformCache.createPlatformDb('bot_runtimes_mirror').delete(id);
}

module.exports = {
  listBots,
  listBotsSync,
  setAllBots,
  setAllBotsSync,
  deleteBotData,
  rowToLegacy,
  formatBotDate,
  parseBotDate,
};
