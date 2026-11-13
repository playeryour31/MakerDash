const { loadCollectionFromFolders } = require('./loadCollectionFromFolders');
const { loadEvents } = require('./loadEvents');
const { loadSlashCommands } = require('./loadSlashCommands');
const { resolveSelectMenusPath } = require('./resolveSelectMenusPath');

module.exports = {
  loadCollectionFromFolders,
  loadEvents,
  loadSlashCommands,
  resolveSelectMenusPath,
};
