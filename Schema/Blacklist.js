const {
  Blacklist,
  startExpiryLoop,
} = require('../src/shared/services/blacklistService');

module.exports = (client) => {
  if (client) startExpiryLoop(client);
};

module.exports.Blacklist = Blacklist;
