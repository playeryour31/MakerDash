#!/usr/bin/env node
/**
 * Legacy token-pool importer.
 *
 * The JSON pools use several historical shapes:
 *   { "Tokens":  ["<token>", ...] }                 UnusedTokens
 *   { "TOKENS":  ["<token>", ...] }                 TokensChecker writes this
 *   { "tokens":  [{ token, reason }, ...] }         NonWorkingTokens
 *   { "Subscriptions": [{ Token, ClientID }, ...] } BotMakerTokens
 *   { "<token>": [{ id, username }, ...] }          WorkingTokens (old map)
 *   ["<token>", ...]                                bare array
 *
 * `import-phase3.ts` only understood the first two, so pools such as
 * WorkingTokens.json (≈1,900 entries) were silently imported as 0 rows.
 * This script understands every shape and is dry-run by default.
 *
 * Usage:
 *   node scripts/import-legacy-token-pools.js            # dry run
 *   node scripts/import-legacy-token-pools.js --apply    # write to Postgres
 *   node scripts/import-legacy-token-pools.js --json     # machine-readable
 *
 * Safe to run repeatedly (idempotent upserts on kind+token).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const POOLS = [
  { kind: 'unused', file: 'Database/Others/UnusedTokens.json' },
  { kind: 'working', file: 'Database/Tokens/WorkingTokens.json' },
  { kind: 'non_working', file: 'Database/Tokens/NonWorkingTokens.json' },
  { kind: 'error', file: 'Database/Tokens/ErrTokens.json' },
  { kind: 'expired', file: 'Database/Tokens/Expired-Tokens.json' },
  { kind: 'botmaker', file: 'Database/Others/BotMakerTokens.json' },
  { kind: 'expiring', file: 'Database/Others/ExpTokens.json' },
];

// A Discord bot token looks like: <base64 id>.<6-7 chars>.<27+ chars>
const { normalizePool } = require('./lib/token-pool-normalize');

function readJson(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8') || 'null');
  } catch (err) {
    return { __error: `invalid JSON: ${err.message}` };
  }
}

function redact(token) {
  return `${String(token).slice(0, 6)}…${String(token).slice(-4)}`;
}

function loadAll() {
  return POOLS.map((pool) => {
    const raw = readJson(pool.file);
    if (raw === null) {
      return { ...pool, missing: true, tokens: [], invalid: [], source: 'missing' };
    }
    const normalized = normalizePool(raw);
    return {
      ...pool,
      missing: false,
      ...normalized,
      source: raw && raw.__error ? raw.__error : normalized.source,
    };
  });
}

async function applyToDb(pools) {
  const { prisma } = require('@maker/database');
  const results = [];

  for (const pool of pools) {
    if (!pool.tokens.length) {
      results.push({ kind: pool.kind, inserted: 0, total: 0 });
      continue;
    }
    let inserted = 0;
    const chunkSize = 500;
    for (let i = 0; i < pool.tokens.length; i += chunkSize) {
      const chunk = pool.tokens.slice(i, i + chunkSize);
      const res = await prisma.tokenPoolEntry.createMany({
        data: chunk.map((token) => ({ kind: pool.kind, token })),
        skipDuplicates: true,
      });
      inserted += res.count || 0;
    }
    const total = await prisma.tokenPoolEntry.count({
      where: { kind: pool.kind },
    });
    results.push({ kind: pool.kind, inserted, total });
  }

  await prisma.$disconnect();
  return results;
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const asJson = argv.includes('--json');

  const pools = loadAll();
  const summary = pools.map((p) => ({
    kind: p.kind,
    file: p.file,
    source: p.source,
    missing: Boolean(p.missing),
    tokens: p.tokens.length,
    unique: p.unique ? p.unique.length : 0,
    invalid: p.invalid.length,
  }));

  if (!apply) {
    if (asJson) {
      process.stdout.write(
        `${JSON.stringify({ dryRun: true, pools: summary }, null, 2)}\n`,
      );
    } else {
      console.log('\n📦 Legacy token pools — DRY RUN (nothing written)\n');
      for (const p of summary) {
        const status = p.missing
          ? 'file missing'
          : `${p.unique} unique / ${p.tokens} parsed${p.invalid ? `, ${p.invalid} invalid` : ''}`;
        console.log(`  ${p.kind.padEnd(12)} ${status}`);
        console.log(`  ${''.padEnd(12)} ${p.file}  [${p.source}]`);
      }
      console.log(
        '\nRun with --apply to upsert into Postgres (idempotent).\n',
      );
    }
    return;
  }

  const results = await applyToDb(pools);
  if (asJson) {
    process.stdout.write(`${JSON.stringify({ dryRun: false, results }, null, 2)}\n`);
    return;
  }
  console.log('\n✅ Token pools imported\n');
  for (const r of results) {
    console.log(
      `  ${r.kind.padEnd(12)} inserted ${String(r.inserted).padStart(5)}   total in DB ${r.total}`,
    );
  }
  const sample = pools.find((p) => p.unique && p.unique.length);
  if (sample) {
    console.log(
      `\n  sample (${sample.kind}): ${redact(sample.unique[0])} … ${redact(sample.unique[sample.unique.length - 1])}`,
    );
  }
  console.log('');
}

main().catch((err) => {
  console.error(`\n❌ ${err.stack || err.message}\n`);
  process.exit(1);
});
