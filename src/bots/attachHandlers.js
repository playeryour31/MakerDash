const path = require('path');
const { Collection } = require('discord.js');

const BOT_ROOT = path.join(__dirname, '..', '..', 'Maker');

function purgeRequireCache(absPath) {
  const target = path.resolve(absPath).replace(/\\/g, '/').toLowerCase();
  for (const key of Object.keys(require.cache)) {
    if (key.replace(/\\/g, '/').toLowerCase() === target) {
      delete require.cache[key];
    }
  }
}

/**
 * Attach collections + loaders used by each spawned customer bot client.
 */
function attachCustomerBotHandlers(client) {
  client.slashcommands = client.slashcommands || new Collection();
  client.button = client.button || new Collection();
  client.selectmenu = client.selectmenu || new Collection();
  client.modal = client.modal || new Collection();
  client.events = client.events || new Collection();
  client.commands = client.commands || new Collection();

  // Bust Windows path-casing stale caches so ready.js streaming fixes load
  const handlerFiles = [
    path.join(BOT_ROOT, 'Handlers', 'Commands.js'),
    path.join(BOT_ROOT, 'Handlers', 'Button.js'),
    path.join(BOT_ROOT, 'Handlers', 'SelectMenus.js'),
    path.join(BOT_ROOT, 'Handlers', 'Modal.js'),
    path.join(BOT_ROOT, 'Handlers', 'Events.js'),
    path.join(__dirname, '..', 'shared', 'loaders', 'index.js'),
    path.join(__dirname, '..', 'shared', 'loaders', 'loadEvents.js'),
  ];
  for (const file of handlerFiles) purgeRequireCache(file);

  require(path.join(BOT_ROOT, 'Handlers', 'Commands'))(client);
  require(path.join(BOT_ROOT, 'Handlers', 'Button'))(client);
  require(path.join(BOT_ROOT, 'Handlers', 'SelectMenus'))(client);
  require(path.join(BOT_ROOT, 'Handlers', 'Modal'))(client);
  require(path.join(BOT_ROOT, 'Handlers', 'Events'))(client);
}

module.exports = { attachCustomerBotHandlers };
