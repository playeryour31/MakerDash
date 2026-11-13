/**
 * Create a Partner API key (prints keyId + secret once).
 *
 * Usage:
 *   cd Apps/api
 *   npx tsx scripts/create-partner-key.ts "My Shop"
 */
import { config } from 'dotenv';
import * as path from 'path';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { encryptBotToken } from '@maker/database';

config({ path: path.join(__dirname, '../.env') });
config({ path: path.join(__dirname, '../../../packages/database/.env') });

function generateCredentials() {
  const { randomBytes } = require('crypto') as typeof import('crypto');
  return {
    keyId: `pk_${randomBytes(12).toString('hex')}`,
    secret: `ps_${randomBytes(32).toString('base64url')}`,
  };
}

async function main() {
  const name = process.argv[2] || 'Partner Shop';
  const { keyId, secret } = generateCredentials();
  const secretHash = createHash('sha256').update(secret, 'utf8').digest('hex');
  const secretEnc = encryptBotToken(secret);

  const prisma = new PrismaClient();
  try {
    const row = await prisma.partnerApiKey.create({
      data: {
        keyId,
        secretHash,
        secretEnc,
        name: String(name),
        scopes: ['catalog:read', 'orders:read', 'orders:write'],
        enabled: true,
      },
    });

    console.log('\n=== Maker Partner API credentials ===');
    console.log(`Name:   ${row.name}`);
    console.log(`DB id:  ${row.id}`);
    console.log(`Key ID: ${keyId}`);
    console.log(`Secret: ${secret}`);
    console.log('\nStore the secret securely. It is shown only once.');
    console.log('Use headers:');
    console.log('  X-Maker-Key-Id');
    console.log('  X-Maker-Timestamp  (unix seconds)');
    console.log('  X-Maker-Signature  HMAC-SHA256(secret, timestamp + "." + rawBody)');
    console.log('=====================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
