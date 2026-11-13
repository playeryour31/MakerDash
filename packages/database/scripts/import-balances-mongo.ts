/**
 * Optional: copy Mongo Balance → Postgres BotBalance.
 * Usage: MONGODB_URI=... npx tsx scripts/import-balances-mongo.ts
 */
import mongoose from 'mongoose';
import { prisma } from '../src/index';

const uri =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/maker-apply';
const dryRun = process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(uri);
  const col = mongoose.connection.collection('balances');
  const cursor = col.find({});
  let n = 0;
  while (await cursor.hasNext()) {
    const row: any = await cursor.next();
    const userId = String(row.userid || row.userId || '');
    const guildId = String(row.guild || row.guildId || '');
    if (!userId || !guildId) continue;
    const coins = Number(row.coins || 0);
    const balance = Number(row.balance || coins || 0);
    if (!dryRun) {
      await prisma.botBalance.upsert({
        where: { userId_guildId: { userId, guildId } },
        create: {
          userId,
          guildId,
          coins,
          balance,
          purchaseDate: row.purchaseDate
            ? new Date(row.purchaseDate)
            : new Date(),
        },
        update: { coins, balance },
      });
    }
    n += 1;
  }
  console.log(`balances imported: ${n}${dryRun ? ' (dry-run)' : ''}`);
  await mongoose.disconnect();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
