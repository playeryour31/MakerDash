const path = require('path');
const { loadCollectionFromFolders } = require('../../src/shared/loaders');

module.exports = (client) => {
  loadCollectionFromFolders(
    client.modal,
    path.join(__dirname, '..', 'Modals'),
    { label: 'Bot Modals Loader' }
  );
};
