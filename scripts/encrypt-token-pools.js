#!/usr/bin/env node
/**
 * Encrypt existing plaintext token-pool rows at rest.
 *
 * Rows written before at-rest encryption are stored verbatim; the new format is
 * `pool:v1:<iv>:<tag>:<ciphertext>` (see packages/database/src/crypto.ts).
 * This script rewrites them in place. It is idempotent: encrypted rows are
 * skipped, so it is safe to run after every import or deploy.
 *
 * Usage:
 *   node scripts/encrypt-token-pools.js            # dry run
 *   node scripts/encrypt-token-pools.js --apply    # rewrite rows
 *   node scripts/encrypt-token-pools.js --json     # machine-readable
 *
 * Requires DATABASE_URL and BOT_TOKEN_ENCRYPTION_KEY (same key the API uses).
 */
'use strict';

const path = require('path');

const ROOT = path.resolve(__dirname, '..');

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const asJson = argv.includes('--json');

  require(path.join(ROOT, 'scripts', 'lib', 'load-env')).loadEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Add it to packages/database/.env or export it before running this script (the dry run also reads the database).',
    );
  }

  const { prisma, encryptPoolToken, isEncryptedPoolToken } = require('@maker/database');

  const rows = await prisma.tokenPoolEntry.findMany({
    select: { id: true, kind: true, token: true },
    orderBy: { createdAt: 'asc' },
  });

  const pending = rows.filter((row) => !isEncryptedPoolToken(row.token));
  const byKind = {};
  for (const row of pending) {
    byKind[row.kind] = (byKind[row.kind] || 0) + 1;
  }

  const summary = {
    total: rows.length,
    alreadyEncrypted: rows.length - pending.length,
    pending: pending.length,
    byKind,
  };

  if (!apply) {
    if (asJson) {
      process.stdout.write(`${JSON.stringify({ dryRun: true, ...summary }, null, 2)}\n`);
    } else {
      console.log('\n🔐 Token pools — DRY RUN (nothing written)\n');
      console.log(`  rows total        ${summary.total}`);
      console.log(`  already encrypted ${summary.alreadyEncrypted}`);
      console.log(`  to encrypt        ${summary.pending}`);
      for (const [kind, count] of Object.entries(byKind)) {
        console.log(`    ${kind.padEnd(14)} ${count}`);
      }
      console.log('\nRun with --apply to rewrite these rows.\n');
    }
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  let merged = 0;
  for (const row of pending) {
    const stored = encryptPoolToken(row.token);
    try {
      await prisma.tokenPoolEntry.update({
        where: { id: row.id },
        data: { token: stored },
      });
      updated += 1;
    } catch (err) {
      // A duplicate means an encrypted copy of the same token already exists;
      // the plaintext row is redundant, so drop it.
      if (err && err.code === 'P2002') {
        await prisma.tokenPoolEntry.delete({ where: { id: row.id } }).catch(() => {});
        merged += 1;
      } else {
        throw err;
      }
    }
  }

  await prisma.$disconnect();

  const result = { dryRun: false, ...summary, updated, merged };
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  console.log('\n✅ Token pools encrypted\n');
  console.log(`  rewritten ${updated}`);
  if (merged) console.log(`  duplicates merged ${merged}`);
  console.log('');
}

main().catch((err) => {
  console.error(`\n❌ ${err.stack || err.message}\n`);
  process.exit(1);
});
