process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:maker@127.0.0.1:5432/maker?schema=public';

const { prisma } = require('@maker/database');

async function main() {
  const [features, platform, prefixes, commands] = await Promise.all([
    prisma.featureRecord.count(),
    prisma.platformRecord.count(),
    prisma.botPrefix.count(),
    prisma.botCommandConfig.count(),
  ]);
  console.log({ features, platform, prefixes, commands });
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
