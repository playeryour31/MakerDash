const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:maker@127.0.0.1:5432/maker?schema=public',
    },
  },
});

async function main() {
  await prisma.$queryRaw`SELECT 1 as ok`;
  const bots = await prisma.botInstance.count();
  const runtimes = await prisma.botRuntime.count();
  const panels = await prisma.applyPanel.count();
  console.log(
    JSON.stringify(
      { ok: true, bots, runtimes, panels, database: 'maker' },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
