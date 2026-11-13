const Balance = require('../../../Schema/Balance');
const blacklistModule = require('../../../Schema/Blacklist');

/** Re-export Mongoose models for shared/Nest consumption */
module.exports = {
  Balance,
  Blacklist: blacklistModule.Blacklist || blacklistModule,
};
