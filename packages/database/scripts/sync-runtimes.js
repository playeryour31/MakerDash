const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../..');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://postgres:maker@127.0.0.1:5432/maker?schema=public',
    },
  },
});

async function main() {
  const tokens = JSON.parse(
    fs.readFileSync(path.join(root, 'Database/Others/Tokens.json'), 'utf8'),
  );
  const run = JSON.parse(
    fs.readFileSync(path.join(root, 'Database/BotMaker/RunBots.json'), 'utf8'),
  );
  const bots = Array.isArray(tokens.Bots) ? tokens.Bots : [];
  const ids = [...new Set(bots.map((b) => String(b.ClientID)).filter(Boolean))];

  for (const id of ids) {
    await prisma.botRuntime.upsert({
      where: { clientId: id },
      create: { clientId: id, running: Boolean(run[id]) },
      update: { running: Boolean(run[id]) },
    });
  }

  const deleted = await prisma.botRuntime.deleteMany({
    where: { clientId: { notIn: ids } },
  });

  const counts = {
    bots: await prisma.botInstance.count(),
    runtimes: await prisma.botRuntime.count(),
    panels: await prisma.applyPanel.count(),
    settings: await prisma.applyGuildSettings.count(),
    apps: await prisma.applyApplication.count(),
    orphanRuntimesRemoved: deleted.count,
  };
  console.log(JSON.stringify(counts, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
