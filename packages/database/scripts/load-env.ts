/**
 * Load .env for tsx scripts before they touch process.env.
 *
 * Prisma Client may load env files implicitly on import, but explicit loading
 * keeps crypto-only scripts (and runs outside the schema directory)
 * deterministic. Import this module first: side-effect order matters.
 */
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): void {
  const files = [
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../../Apps/api/.env'),
  ];
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv') as typeof import('dotenv');
    for (const file of files) {
      if (fs.existsSync(file)) dotenv.config({ path: file, quiet: true });
    }
  } catch {
    /* dotenv unavailable — rely on the process environment */
  }
}

loadEnv();
