/**
 * Import remaining JSON stores into Postgres (Phase 2+).
 * Skips Apply (already Phase 1).
 */
import './load-env';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../src/index';

const dryRun = process.argv.includes('--dry-run');
const root = path.resolve(__dirname, '../../..');

function readJson(rel: string): Record<string, any> {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8') || '{}') || {};
  } catch {
    return {};
  }
}

function guessBotClientId(key: string): string | null {
  const parts = String(key).split('_').filter(Boolean);
  // many keys end with bot client id (snowflake 17-20 digits)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d{16,20}$/.test(parts[i])) return parts[i];
  }
  return null;
}

function sanitizeJson(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.replace(/\u0000/g, '');
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[String(k).replace(/\u0000/g, '')] = sanitizeJson(v);
    }
    return out;
  }
  return value;
}

async function upsertFeature(
  namespace: string,
  key: string,
  value: any,
) {
  if (dryRun) return;
  const clean = sanitizeJson(value);
  await prisma.featureRecord.upsert({
    where: { namespace_key: { namespace, key } },
    create: {
      namespace,
      key,
      value: clean ?? null,
      botClientId: guessBotClientId(key),
    },
    update: {
      value: clean ?? null,
      botClientId: guessBotClientId(key),
    },
  });
}

async function upsertPlatform(namespace: string, key: string, value: any) {
  if (dryRun) return;
  const clean = sanitizeJson(value);
  await prisma.platformRecord.upsert({
    where: { namespace_key: { namespace, key } },
    create: { namespace, key, value: clean ?? null },
    update: { value: clean ?? null },
  });
}

const SETTINGS: Array<[string, string]> = [
  ['ticket', 'Maker/Json-Database/Settings/ticket.json'],
  ['temp_ticket', 'Maker/Json-Database/Settings/TempTicket.json'],
  ['protection', 'Maker/Json-Database/Settings/Protection.json'],
  ['giveaway', 'Maker/Json-Database/Settings/Giveaway.json'],
  ['autoline', 'Maker/Json-Database/Settings/Autoline.json'],
  ['azkar', 'Maker/Json-Database/Settings/Azkar.json'],
  ['quran', 'Maker/Json-Database/Settings/Quran.json'],
  ['broadcast', 'Maker/Json-Database/Settings/broadcast.json'],
  ['feedback', 'Maker/Json-Database/Settings/Feedback.json'],
  ['offer', 'Maker/Json-Database/Settings/Offer.json'],
  ['selfrole', 'Maker/Json-Database/Settings/Selfrole.json'],
  ['shop', 'Maker/Json-Database/Settings/shopDB.json'],
  ['stock_db', 'Maker/Json-Database/Settings/stockDB.json'],
  ['suggestion', 'Maker/Json-Database/Settings/Suggestion.json'],
  ['tax', 'Maker/Json-Database/Settings/Tax.json'],
  ['temp_channels', 'Maker/Json-Database/Settings/TempChannels.json'],
  ['temp_role', 'Maker/Json-Database/Settings/TempRole.json'],
  ['temp_voice', 'Maker/Json-Database/Settings/TempVoice.json'],
];

const SYSTEMS: Array<[string, string]> = [
  ['sys_log', 'Maker/Json-Database/Systems/Log.json'],
  ['sys_reply', 'Maker/Json-Database/Systems/Reply.json'],
  ['sys_selfrole', 'Maker/Json-Database/Systems/Selfrole.json'],
  ['sys_stock', 'Maker/Json-Database/Systems/Stock.json'],
  ['sys_userdata', 'Maker/Json-Database/Systems/UserData.json'],
  ['sys_voicetemp', 'Maker/Json-Database/Systems/VoiceTemp.json'],
];

const PLATFORM: Array<[string, string]> = [
  ['aliases', 'Database/Others/Aliases.json'],
  ['command_status', 'Database/Others/CommandStatus.json'],
  ['language', 'Database/Others/Language.json'],
  ['building', 'Database/Others/Building.json'],
  ['enable_channels', 'Database/Others/EnableChannels.json'],
  ['expired', 'Database/Others/Expired.json'],
  ['voices', 'Database/Others/Voices.json'],
  ['owner_data', 'Database/Others/OwnerData.json'],
  ['botmaker_data', 'Database/BotMaker/Data.json'],
  ['botmaker_status', 'Database/BotMaker/Status.json'],
  ['botmaker_logs', 'Database/BotMaker/Logs.json'],
  ['botmaker_permissions', 'Database/BotMaker/Permissions.json'],
  ['botmaker_access', 'Database/BotMaker/Access.json'],
  ['botmaker_admins', 'Database/BotMaker/Admins.json'],
  ['botmaker_blacklist', 'Database/BotMaker/Blacklisted.json'],
  ['botmaker_bots_blacklisted', 'Database/BotMaker/BotsBlacklisted.json'],
  ['botmaker_balance', 'Database/BotMaker/Balance.json'],
  ['dashboard_access', 'Database/Dashboard/Access.json'],
  ['dashboard_bot_admins', 'Database/Dashboard/BotAdmins.json'],
  ['dashboard_2fa', 'Database/Dashboard/TwoFactor.json'],
  ['dashboard_account_security', 'Database/Dashboard/AccountSecurity.json'],
  ['payments_coins', 'Database/Payments/Coins.json'],
  ['payments_transfers', 'Database/Payments/Transfers.json'],
  ['errors', 'Database/Errors/Errors.json'],
];

async function importKvFiles(
  pairs: Array<[string, string]>,
  kind: 'feature' | 'platform',
) {
  let count = 0;
  for (const [ns, rel] of pairs) {
    const raw = readJson(rel);
    for (const [key, value] of Object.entries(raw)) {
      if (kind === 'feature') await upsertFeature(ns, key, value);
      else await upsertPlatform(ns, key, value);
      count += 1;
    }
    console.log(`  ${ns}: ${Object.keys(raw).length} keys`);
  }
  return count;
}

async function importPrefixes() {
  const raw = readJson('Database/Others/PrefixData.json');
  let n = 0;
  for (const [key, value] of Object.entries(raw)) {
    const clientId = String(key).replace(/^Prefix_/, '');
    if (!clientId) continue;
    if (!dryRun) {
      await prisma.botPrefix.upsert({
        where: { clientId },
        create: { clientId, prefix: String(value || '#') },
        update: { prefix: String(value || '#') },
      });
    }
    n += 1;
  }
  return n;
}

async function importPrices() {
  const raw = readJson('Database/BotMaker/Prices.json');
  let n = 0;
  for (const [key, value] of Object.entries(raw)) {
    const idx = String(key).lastIndexOf('_');
    if (idx < 0) continue;
    const priceKey = String(key).slice(0, idx);
    const guildId = String(key).slice(idx + 1);
    const price = Number(value);
    if (!guildId || Number.isNaN(price)) continue;
    if (!dryRun) {
      await prisma.guildBotPrice.upsert({
        where: { guildId_priceKey: { guildId, priceKey } },
        create: { guildId, priceKey, price },
        update: { price },
      });
    }
    n += 1;
  }
  return n;
}

async function importCommands() {
  const dir = path.join(root, 'Database', 'CommandsData');
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const file of fs.readdirSync(dir)) {
    const m = file.match(/^BotsCommands_(.+)\.json$/);
    if (!m) continue;
    const clientId = m[1];
    const raw = readJson(path.join('Database', 'CommandsData', file));
    const commands =
      raw[`commands_${clientId}`] || raw.commands || Object.values(raw)[0] || [];
    if (!dryRun) {
      await prisma.botCommandConfig.upsert({
        where: { clientId },
        create: { clientId, commands },
        update: { commands },
      });
    }
    n += 1;
  }
  return n;
}

async function importBalancesFromJsonBackup() {
  // Optional JSON backups if Mongo dump isn't available
  const raw = readJson('Database/Backups/Coins.json');
  let n = 0;
  // shape unknown — if array of {userid,guild,balance}
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.balances)
      ? raw.balances
      : [];
  for (const row of list) {
    const userId = String(row.userid || row.userId || '');
    const guildId = String(row.guild || row.guildId || '');
    if (!userId || !guildId) continue;
    if (!dryRun) {
      await prisma.botBalance.upsert({
        where: { userId_guildId: { userId, guildId } },
        create: {
          userId,
          guildId,
          coins: Number(row.coins || row.balance || 0),
          balance: Number(row.balance || row.coins || 0),
          purchaseDate: row.purchaseDate
            ? new Date(row.purchaseDate)
            : new Date(),
        },
        update: {
          coins: Number(row.coins || row.balance || 0),
          balance: Number(row.balance || row.coins || 0),
        },
      });
    }
    n += 1;
  }
  return n;
}

async function main() {
  console.log(`Phase-2+ import ${dryRun ? '(dry-run)' : '(apply)'}`);
  console.log('Features (Settings):');
  const f1 = await importKvFiles(SETTINGS, 'feature');
  console.log('Features (Systems):');
  const f2 = await importKvFiles(SYSTEMS, 'feature');
  console.log('Platform:');
  const p = await importKvFiles(PLATFORM, 'platform');
  const prefixes = await importPrefixes();
  const prices = await importPrices();
  const commands = await importCommands();
  const balances = await importBalancesFromJsonBackup();
  console.log('Totals:', {
    featureKeys: f1 + f2,
    platformKeys: p,
    prefixes,
    prices,
    commands,
    balancesFromJsonBackup: balances,
  });
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
