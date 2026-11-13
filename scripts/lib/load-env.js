'use strict';

/**
 * Load .env files for root scripts before anything reads process.env.
 *
 * Prisma Client happens to load env files on import in some versions, but
 * scripts that only use crypto (or run outside the schema directory) must not
 * rely on that. Loading explicitly keeps behavior deterministic.
 *
 * Order matters: later files override earlier ones.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const FILES = [
  path.join(ROOT, '.env'),
  path.join(ROOT, 'packages', 'database', '.env'),
  path.join(ROOT, 'Apps', 'api', '.env'),
];

function loadEnv() {
  let dotenv;
  try {
    dotenv = require('dotenv');
  } catch {
    return; // rely on the process environment
  }
  for (const file of FILES) {
    if (fs.existsSync(file)) dotenv.config({ path: file, quiet: true });
  }
}

module.exports = { loadEnv, ENV_FILES: FILES };
