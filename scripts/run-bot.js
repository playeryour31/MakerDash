const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

// Phase-1 data plane flags (same source as Nest API when present)
try {
  const dotenv = require('dotenv');
  const backendEnv = path.join(ROOT, 'Apps', 'api', '.env');
  if (fs.existsSync(backendEnv)) {
    dotenv.config({ path: backendEnv });
  }
} catch {
  /* dotenv optional for bot-only installs */
}

// Defaults: Postgres SSOT — bots talk to Prisma directly (not Nest round-trip)
if (!process.env.DATA_WRITE_MODE) process.env.DATA_WRITE_MODE = 'postgres';
if (!process.env.DATA_READ_SOURCE) process.env.DATA_READ_SOURCE = 'postgres';
if (!process.env.DATA_SHADOW_COMPARE) process.env.DATA_SHADOW_COMPARE = 'false';
if (!process.env.REDIS_URL) process.env.REDIS_URL = 'redis://127.0.0.1:6379';
// Prefer local Prisma for Discord bots unless explicitly forced
if (
  process.env.DATA_READ_SOURCE === 'postgres' &&
  process.env.FORCE_BOT_DATA_API !== '1' &&
  process.env.FORCE_BOT_DATA_API !== 'true'
) {
  process.env.USE_BOT_DATA_API = 'false';
}

// Route st.db → Postgres before any handlers load
require('../src/shared/db/installStDbBridge').installStDbBridge();

const tag = chalk.bgHex('#0d9488').white.bold(' maker ');

console.log('');
console.log(`${tag} ${chalk.bold('Discord Maker + customer bots')}`);
console.log(`${chalk.gray('─'.repeat(48))}`);
console.log(`${chalk.gray('root')}  ${ROOT}`);
console.log(`${chalk.gray('hint')}  full stack: ${chalk.cyan('npm run dev')}`);
if (process.env.USE_BOT_DATA_API === 'true' || process.env.USE_BOT_DATA_API === '1') {
  console.log(
    `${chalk.gray('data')}  API → ${process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000/api'}`,
  );
} else {
  console.log(`${chalk.gray('data')}  Prisma direct (USE_BOT_DATA_API off)`);
}
console.log(`${chalk.gray('data')}  PG + Redis/BullMQ (optional)`);
console.log(`${chalk.gray('─'.repeat(48))}`);
console.log('');

process.on('warning', (warning) => {
  if (String(warning?.name || '').includes('Deprecation')) return;
  console.warn(`${tag} ${chalk.yellow('warning')} ${warning.message}`);
});

try {
  require('../src/maker/bootstrap').bootstrapMaker();
  console.log(`${tag} ${chalk.green('✓')} booting Discord gateway…`);
} catch (e) {
  console.error(`${tag} ${chalk.red('fatal')} ${e.stack || e.message}`);
  process.exit(1);
}
