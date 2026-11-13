const path = require('path');
const { loadCollectionFromFolders, resolveSelectMenusPath } = require('../../src/shared/loaders');

module.exports = (client) => {
  loadCollectionFromFolders(
    client.selectmenu,
    resolveSelectMenusPath(path.join(__dirname, '..')),
    { label: 'Subscriptions SelectMenus Loader' }
  );
};
