const path = require('path');
const { loadCollectionFromFolders } = require('../../src/shared/loaders');

module.exports = (client) => {
  loadCollectionFromFolders(
    client.button,
    path.join(__dirname, '..', 'Buttons'),
    { label: 'Subscriptions Buttons Loader' }
  );
};
