/**
 * Import token pools, dashboard access, account security, bot admins, IDs into Postgres.
 */
import './load-env';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../src/index';
import type { TokenPoolKind } from '@prisma/client';

const dryRun = process.argv.includes('--dry-run');
const root = path.resolve(__dirname, '../../..');

function readJson(rel: string): any {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8') || '{}') || {};
  } catch {
    return {};
  }
}

function tokenFromValue(value: any): string | null {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  for (const key of ['token', 'Token', 'TOKEN', 'access_token', 'accessToken']) {
    if (typeof value[key] === 'string') return value[key];
  }
  return null;
}

const DISCORD_TOKEN = /^[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{25,45}$/;

/**
 * Handles every legacy pool shape:
 *   { Tokens: [...] } | { TOKENS: [...] } | { tokens: [{ token }] }
 *   { Subscriptions: [{ Token }] } | { "<token>": [metadata] } | bare array
 */
function extractTokens(raw: any): string[] {
  const out: string[] = [];
  const push = (value: any) => {
    const token = tokenFromValue(value);
    if (!token) return;
    const trimmed = String(token).trim();
    if (trimmed) out.push(trimmed);
  };

  if (Array.isArray(raw)) {
    raw.forEach(push);
  } else if (raw && typeof raw === 'object') {
    const knownKeys = ['Tokens', 'TOKENS', 'tokens', 'Subscriptions', 'Bots', 'items', 'data'];
    for (const key of knownKeys) {
      if (Array.isArray(raw[key])) raw[key].forEach(push);
    }
    // Old format: the token itself is the object key.
    for (const key of Object.keys(raw)) {
      if (DISCORD_TOKEN.test(key)) out.push(key);
    }
    if (!out.length) {
      for (const value of Object.values(raw)) {
        if (Array.isArray(value)) value.forEach(push);
      }
    }
  }
  return out;
}

async function importTokenPool(
  kind: TokenPoolKind,
  rel: string,
  _keys: string[] = ['Tokens', 'TOKENS'],
) {
  const raw = readJson(rel);
  const tokens = [...new Set(extractTokens(raw))];
  console.log(`  ${kind}: ${tokens.length} tokens from ${rel}`);
  if (dryRun || !tokens.length) return tokens.length;
  for (const token of tokens) {
    await prisma.tokenPoolEntry.upsert({
      where: { kind_token: { kind, token } },
      create: { kind, token },
      update: {},
    });
  }
  return tokens.length;
}

async function importDashboardAccess() {
  const raw = readJson('Database/Dashboard/Access.json');
  const bySlug = raw.bySlug || {};
  let n = 0;
  for (const record of Object.values(bySlug) as any[]) {
    if (!record?.slug || !record?.clientId) continue;
    if (!dryRun) {
      await prisma.dashboardAccess.upsert({
        where: { clientId: String(record.clientId) },
        create: {
          slug: String(record.slug),
          clientId: String(record.clientId),
          type: String(record.type || 'Apply'),
          ownerId: record.ownerId ? String(record.ownerId) : null,
          guildId: record.guildId ? String(record.guildId) : null,
          purchasesId: record.purchasesId != null ? String(record.purchasesId) : null,
        },
        update: {
          type: String(record.type || 'Apply'),
          ownerId: record.ownerId ? String(record.ownerId) : null,
          guildId: record.guildId ? String(record.guildId) : null,
          purchasesId: record.purchasesId != null ? String(record.purchasesId) : null,
        },
      });
    }
    n += 1;
  }
  console.log(`  dashboard_access: ${n}`);
  return n;
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

async function importPlatformBlob(namespace: string, rel: string) {
  const raw = readJson(rel);
  if (!raw || typeof raw !== 'object') return 0;
  // Store whole file under __index__ when it's an index blob, else per-key
  if (raw.bySlug || raw.byUserId) {
    if (!dryRun) {
      const clean = sanitizeJson(raw);
      await prisma.platformRecord.upsert({
        where: { namespace_key: { namespace, key: '__index__' } },
        create: { namespace, key: '__index__', value: clean },
        update: { value: clean },
      });
      if (raw.byUserId) {
        await prisma.platformRecord.upsert({
          where: { namespace_key: { namespace, key: '__store__' } },
          create: { namespace, key: '__store__', value: clean },
          update: { value: clean },
        });
      }
    }
    console.log(`  ${namespace}: index blob`);
    return 1;
  }
  let n = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (!dryRun) {
      try {
        const clean = sanitizeJson(value);
        await prisma.platformRecord.upsert({
          where: { namespace_key: { namespace, key: String(key).replace(/\u0000/g, '') } },
          create: {
            namespace,
            key: String(key).replace(/\u0000/g, ''),
            value: clean as any,
          },
          update: { value: clean as any },
        });
      } catch (err: any) {
        console.warn(`  skip ${namespace}/${key}: ${err.message}`);
        continue;
      }
    }
    n += 1;
  }
  console.log(`  ${namespace}: ${n} keys`);
  return n;
}

async function main() {
  console.log(dryRun ? '[dry-run] import phase3' : 'import phase3');
  await importTokenPool('unused', 'Database/Others/UnusedTokens.json');
  await importTokenPool('working', 'Database/Tokens/WorkingTokens.json');
  await importTokenPool('non_working', 'Database/Tokens/NonWorkingTokens.json');
  await importTokenPool('error', 'Database/Tokens/ErrTokens.json');
  await importTokenPool('expired', 'Database/Tokens/Expired-Tokens.json');
  await importTokenPool('botmaker', 'Database/Others/BotMakerTokens.json');
  await importTokenPool('expiring', 'Database/Others/ExpTokens.json');
  await importDashboardAccess();
  await importPlatformBlob('dashboard_bot_admins', 'Database/Dashboard/BotAdmins.json');
  await importPlatformBlob('dashboard_account_security', 'Database/Dashboard/AccountSecurity.json');
  await importPlatformBlob('botmaker_ids', 'Database/BotMaker/IDs.json');

  // Subscriptions leftovers
  const subsDir = path.join(root, 'Subscriptions', 'Database');
  if (fs.existsSync(subsDir)) {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full);
        else if (ent.name.endsWith('.json')) files.push(full);
      }
    };
    walk(subsDir);
    for (const full of files) {
      const rel = path.relative(root, full).replace(/\\/g, '/');
      const ns = `subs_${path.basename(full, '.json').toLowerCase()}`;
      await importPlatformBlob(ns, rel);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
