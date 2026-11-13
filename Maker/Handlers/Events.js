const path = require('path');
const { loadEvents } = require('../../src/shared/loaders');

module.exports = (client) => {
  loadEvents(client, path.join(__dirname, '..', 'Events'), {
    label: 'Maker Events Loader',
  });
};
