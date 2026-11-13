/**
 * One-shot: import Tokens.json bots missing from Postgres + set their BotRuntime.
 * Does not print tokens.
 */
const fs = require('fs');
const path = require('path');
const { prisma, encryptBotToken } = require('@maker/database');

const tokensFile = path.resolve(__dirname, '..', 'Database', 'Others', 'Tokens.json');
const runFile = path.resolve(__dirname, '..', 'Database', 'BotMaker', 'RunBots.json');

function parseBotDate(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

(async () => {
  const raw = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
  const bots = Array.isArray(raw.Bots) ? raw.Bots : [];
  const run = fs.existsSync(runFile)
    ? JSON.parse(fs.readFileSync(runFile, 'utf8'))
    : {};

  let created = 0;
  let runtime = 0;

  for (const bot of bots) {
    const clientId = String(bot.ClientID || '');
    const plain = String(bot.Token || '');
    if (!clientId || !plain) continue;

    const exists = await prisma.botInstance.findUnique({
      where: { clientId },
      select: { clientId: true },
    });

    if (!exists) {
      const typeRaw = String(bot.Type || 'System');
      const type = typeRaw === 'Azkar' ? 'Muslim' : typeRaw;
      await prisma.botInstance.create({
        data: {
          clientId,
          tokenEnc: encryptBotToken(plain),
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
          startsAt: parseBotDate(bot.startTime),
          endsAt: parseBotDate(bot.endTime),
          language: bot.language === 'En' ? 'En' : 'Ar',
        },
      });
      created += 1;
      console.log(`created BotInstance ${clientId} type=${type}`);
    }

    const desired = run[clientId] !== undefined ? Boolean(run[clientId]) : true;
    await prisma.botRuntime.upsert({
      where: { clientId },
      create: { clientId, running: desired },
      update: { running: desired },
    });
    runtime += 1;
    console.log(`runtime ${clientId}=${desired}`);
  }

  console.log(JSON.stringify({ created, runtimeSynced: runtime, totalTokens: bots.length }));
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
