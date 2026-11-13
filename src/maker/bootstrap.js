const path = require('path');
const { Collection, REST, Routes } = require('discord.js');
const { createClient } = require('./client/createClient');
const { loadSlashCommands } = require('../shared/loaders');
const { getMakerConfig } = require('../shared/config');

const ROOT = path.join(__dirname, '..', '..');
const MAKER_ROOT = path.join(ROOT, 'Main');

/**
 * Bootstrap the main control bot (files live under /Main).
 * Hydrates Postgres caches before loading Main handlers.
 */
async function bootstrapMakerAsync() {
  // Maker customer bots may still use st.db shim
  require('../shared/db/installStDbBridge').installStDbBridge();

  if (!process.env.DATA_WRITE_MODE) process.env.DATA_WRITE_MODE = 'postgres';
  if (!process.env.DATA_READ_SOURCE) process.env.DATA_READ_SOURCE = 'postgres';
  if (!process.env.DATA_SHADOW_COMPARE) process.env.DATA_SHADOW_COMPARE = 'false';

  // Bot tokens are AES-256-GCM encrypted at rest. Without a usable key the
  // bots would silently fall back to stale JSON, so refuse to boot instead.
  require('@maker/database').assertTokenEncryptionKey();

  try {
    const featureCache = require('../shared/services/featureCache');
    const platformCache = require('../shared/services/platformCache');
    const { hydrateTypedMirrors } = require('../shared/services/hydrateMirrors');
    await featureCache.hydrateAll();
    await platformCache.hydrateAll();
    await hydrateTypedMirrors();
    void platformCache.startKvSubscriber();
    // Warm bots mirror from Prisma
    const { bots } = require('../shared/services/mainDb');
    await bots.listBots(true);
  } catch (err) {
    console.warn(`[bootstrap] cache hydrate failed: ${err.message}`);
  }

  const config = getMakerConfig();
  if (!config.Token) {
    throw new Error(
      'Control bot token missing. Set MAIN_BOT_TOKEN in Apps/api/.env or provide Main/Resources/Config.json (see docs/SECURITY-ROTATION.md).',
    );
  }
  const client = createClient();

  client.slashcommands = new Collection();
  client.Guildcommands = new Collection();
  client.button = new Collection();
  client.selectmenu = new Collection();
  client.modal = new Collection();
  client.events = new Collection();
  client.commands = new Collection();

  const { body: slashcommands } = loadSlashCommands(
    client.slashcommands,
    path.join(MAKER_ROOT, 'SlashCommands'),
    { label: 'Main SlashCommands Loader' },
  );

  require(path.join(MAKER_ROOT, 'Handlers', 'Button'))(client);
  require(path.join(MAKER_ROOT, 'Handlers', 'SelectMenus'))(client);
  require(path.join(MAKER_ROOT, 'Handlers', 'Modal'))(client);
  require(path.join(MAKER_ROOT, 'Handlers', 'Events'))(client);
  require(path.join(MAKER_ROOT, 'Handlers', 'Commands'))(client);

  client.on('ready', async () => {
    const id = client.user.id;
    const rest = new REST({ version: '10' }).setToken(config.Token);
    try {
      await rest.put(Routes.applicationCommands(id), { body: slashcommands });
    } catch (error) {
      console.error(error);
    }

    try {
      require(path.join(ROOT, 'Schema', 'Blacklist'))(client);
    } catch (err) {
      console.warn(`[bootstrap] blacklist loop: ${err.message}`);
    }
  });

  const { attachMainKeepAlive } = require('./client/keepAlive');
  attachMainKeepAlive(client, config.Token);

  require(path.join(ROOT, 'Maker'));

  return client;
}

function bootstrapMaker() {
  void bootstrapMakerAsync().catch((err) => {
    console.error(`[bootstrap] fatal: ${err.stack || err.message}`);
    process.exit(1);
  });
  return null;
}

module.exports = { bootstrapMaker, bootstrapMakerAsync, MAKER_ROOT };
