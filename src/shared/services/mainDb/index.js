const { Database } = require('./Database');
const bots = require('./botsService');
const runtimes = require('./runtimeService');
const prices = require('./pricesService');
const prefixes = require('./prefixService');
const pools = require('./tokenPoolService');
const commands = require('./commandsConfigService');
const { kv } = require('./platformKv');
const staticCatalog = require('./staticCatalog');

module.exports = {
  Database,
  bots,
  runtimes,
  prices,
  prefixes,
  pools,
  commands,
  kv,
  staticCatalog,
};
