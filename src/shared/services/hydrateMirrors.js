/**
 * Hydrate sync mirrors used by the st.db bridge from typed Prisma tables.
 */
async function hydrateTypedMirrors() {
  const { prisma } = require('@maker/database');
  const platformCache = require('./platformCache');

  // Runtimes
  const runtimes = await prisma.botRuntime.findMany();
  const runDb = platformCache.createPlatformDb('bot_runtimes_mirror');
  for (const r of runtimes) runDb.set(r.clientId, r.running);

  // Prefixes
  const prefixes = await prisma.botPrefix.findMany();
  const prefixDb = platformCache.createPlatformDb('bot_prefixes_mirror');
  for (const p of prefixes) {
    prefixDb.set(`Prefix_${p.clientId}`, p.prefix);
    prefixDb.set(p.clientId, p.prefix);
  }

  // Prices
  const prices = await prisma.guildBotPrice.findMany();
  const priceDb = platformCache.createPlatformDb('guild_bot_prices_mirror');
  for (const p of prices) {
    priceDb.set(`${p.priceKey}_${p.guildId}`, p.price);
  }

  // Commands
  const cmds = await prisma.botCommandConfig.findMany();
  const cmdDb = platformCache.createPlatformDb('bot_command_configs_mirror');
  for (const c of cmds) cmdDb.set(c.clientId, c.commands);

  // Token pools — rows are stored encrypted, the mirror keeps plaintext.
  const poolRows = await prisma.tokenPoolEntry.findMany({
    select: { kind: true, token: true },
  });
  const { decryptPoolToken } = require('@maker/database');
  const byKind = {};
  for (const row of poolRows) {
    if (!byKind[row.kind]) byKind[row.kind] = [];
    let token = row.token;
    try {
      token = decryptPoolToken(row.token);
    } catch {
      /* keep the stored value if the key does not match */
    }
    byKind[row.kind].push(token);
  }
  for (const [kind, tokens] of Object.entries(byKind)) {
    const db = platformCache.createPlatformDb(`token_pool_${kind}`);
    db.set('Tokens', tokens);
  }

  // Bots list — prefer decrypted tokens only when encryption key present;
  // otherwise keep tokens_mirror from platform import.
  try {
    const bots = await prisma.botInstance.findMany();
    const { decryptBotToken } = require('@maker/database');
    const list = bots.map((b) => {
      let token = b.tokenEnc;
      try {
        token = decryptBotToken(b.tokenEnc);
      } catch {
        /* keep enc blob if key missing */
      }
      return {
        ClientID: b.clientId,
        Token: token,
        Owner: b.ownerId,
        Buyer: b.buyerId,
        Seller: b.sellerId,
        BotID: b.botNumber,
        Type: b.type,
        Servers: b.servers || [],
        Server: b.serverId || b.guildId,
        guild: b.guildId,
        Price: b.price,
        PurchasesID: b.purchasesId,
        TokenType: b.tokenType,
        endTime: b.endsAt
          ? formatLegacyDate(b.endsAt)
          : null,
        startTime: b.startsAt
          ? formatLegacyDate(b.startsAt)
          : null,
        language: b.language,
        warnedBefore: b.meta?.warnedBefore,
      };
    });
    platformCache.createPlatformDb('tokens_mirror').set('Bots', list);
  } catch (err) {
    console.warn(`[hydrate] bots mirror: ${err.message}`);
  }

  console.log('[hydrate] typed mirrors ready');
}

function formatLegacyDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

module.exports = { hydrateTypedMirrors };
