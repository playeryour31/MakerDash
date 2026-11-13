const path = require('path');
const { loadCollectionFromFolders } = require('../../src/shared/loaders');

module.exports = (client) => {
  if (!client.commands) {
    client.commands = new Map();
  }

  loadCollectionFromFolders(
    client.commands,
    path.join(__dirname, '..', 'PrefixCommands'),
    { label: 'Bot PrefixCommands Loader' }
  );
};
