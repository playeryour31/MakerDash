const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const MAIN_ROOT = path.join(ROOT, 'Main');
const MAKER_BOTS_ROOT = path.join(ROOT, 'Maker');

/**
 * Thin config accessor.
 *
 * Secrets are read from the environment first; the JSON files remain as a
 * fallback for existing servers so the repo can ship without live tokens.
 * Env overrides:
 *   MAIN_BOT_TOKEN       → Config.json Token
 *   MAIN_LOG_BOT_TOKEN   → Config.json Errors.Token
 *   OPENAI_API_KEY       → Config.json Errors.API
 *   MONGODB_URI          → Config.json MongooseUrl
 *   MAKER_WEBHOOK_TOKEN  → Maker/Resources/Config.json Configure.WebhookDM.Token
 */
function readJsonConfig(file) {
  try {
    return require(file);
  } catch (err) {
    if (err && err.code === 'MODULE_NOT_FOUND') {
      console.warn(`[config] missing ${file} — relying on environment variables`);
      return {};
    }
    throw err;
  }
}

function readMainConfig() {
  return readJsonConfig(path.join(MAIN_ROOT, 'Resources', 'Config.json'));
}

function getMakerConfig() {
  const raw = readMainConfig();
  const errors = raw.Errors && typeof raw.Errors === 'object' ? raw.Errors : {};
  return {
    ...raw,
    Token: process.env.MAIN_BOT_TOKEN || raw.Token,
    MongooseUrl: process.env.MONGODB_URI || raw.MongooseUrl,
    Errors: {
      ...errors,
      Token: process.env.MAIN_LOG_BOT_TOKEN || errors.Token,
      API: process.env.OPENAI_API_KEY || errors.API,
    },
  };
}

function getBotConfig() {
  const raw = readJsonConfig(
    path.join(MAKER_BOTS_ROOT, 'Resources', 'Config.json'),
  );
  const configure =
    raw.Configure && typeof raw.Configure === 'object' ? raw.Configure : {};
  const webhook =
    configure.WebhookDM && typeof configure.WebhookDM === 'object'
      ? configure.WebhookDM
      : {};
  return {
    ...raw,
    Configure: {
      ...configure,
      WebhookDM: {
        ...webhook,
        Token: process.env.MAKER_WEBHOOK_TOKEN || webhook.Token,
      },
    },
  };
}

function getPaths() {
  return {
    root: ROOT,
    main: MAIN_ROOT,
    maker: MAKER_BOTS_ROOT,
    bots: MAKER_BOTS_ROOT,
    database: path.join(ROOT, 'Database'),
    botJsonDatabase: path.join(MAKER_BOTS_ROOT, 'Json-Database'),
    backups: path.join(ROOT, 'Backups'),
    resources: path.join(MAIN_ROOT, 'Resources'),
    apps: path.join(ROOT, 'Apps'),
  };
}

module.exports = {
  getMakerConfig,
  getBotConfig,
  getPaths,
  MAIN_ROOT,
  MAKER_ROOT: MAIN_ROOT, // backward-compatible alias for control-bot root
  MAKER_BOTS_ROOT,
};
