/**
 * Import Mongo blacklist + JSON blacklists into user_blacklists.
 */
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../src/index';

const dryRun = process.argv.includes('--dry-run');
const root = path.resolve(__dirname, '../../..');

async function importMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/maker-apply';
  try {
    const mongoose = await import('mongoose');
    await mongoose.default.connect(uri, { serverSelectionTimeoutMS: 3000 });
    const col = mongoose.default.connection.collection('blacklists');
    const docs = await col.find({}).toArray();
    let n = 0;
    for (const d of docs as any[]) {
      const userId = String(d.UserID || d.userId || '');
      if (!userId) continue;
      if (!dryRun) {
        await prisma.userBlacklist.upsert({
          where: { userId },
          create: {
            userId,
            reason: String(d.Reason || d.reason || ''),
            adminId: String(d.Admin || d.adminId || 'import'),
            expiresAt: d.Duration ? new Date(d.Duration) : null,
          },
          update: {
            reason: String(d.Reason || d.reason || ''),
            adminId: String(d.Admin || d.adminId || 'import'),
            expiresAt: d.Duration ? new Date(d.Duration) : null,
          },
        });
      }
      n += 1;
    }
    await mongoose.default.disconnect();
    console.log(`  mongo blacklists: ${n}`);
    return n;
  } catch (err: any) {
    console.warn(`  mongo skip: ${err.message}`);
    return 0;
  }
}

function readJson(rel: string): any {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
  } catch {
    return null;
  }
}

async function importJsonBlacklists() {
  let n = 0;
  const files = [
    'Database/BotMaker/Blacklisted.json',
    'Subscriptions/Database/Makers/Blacklist.json',
  ];
  for (const rel of files) {
    const raw = readJson(rel);
    if (!raw || typeof raw !== 'object') continue;
    for (const [key, value] of Object.entries(raw)) {
      const entries = Array.isArray(value) ? value : [value];
      for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue;
        const userId = String(
          (entry as any).userId || (entry as any).UserID || (entry as any).id || '',
        );
        if (!userId || !/^\d{5,}$/.test(userId)) continue;
        if (!dryRun) {
          await prisma.userBlacklist.upsert({
            where: { userId },
            create: {
              userId,
              reason: String((entry as any).reason || (entry as any).Reason || key),
              adminId: String((entry as any).admin || (entry as any).Admin || 'import'),
              expiresAt: null,
            },
            update: {
              reason: String((entry as any).reason || (entry as any).Reason || key),
            },
          });
        }
        n += 1;
      }
    }
    console.log(`  ${rel}: processed`);
  }
  console.log(`  json blacklist rows: ${n}`);
  return n;
}

async function main() {
  console.log(dryRun ? '[dry-run] import blacklist' : 'import blacklist');
  await importMongo();
  await importJsonBlacklists();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
