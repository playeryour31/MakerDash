const { Database } = require('./mainDb');
const moment = require('moment-timezone');
const { paths } = require('../db/paths');

const tokensDb = new Database(paths.tokens);

/**
 * Lightweight subscription reads for Maker + API.
 * Expiry purge lives in Main/Events/ready.js via bots.deleteBotData (Prisma).
 */
function listBotSubscriptions() {
  return tokensDb.get('Bots') || [];
}

function findSubscriptionByClientId(clientId) {
  return listBotSubscriptions().find((b) => b.ClientID === clientId) || null;
}

function listSubscriptionsForOwner(ownerId) {
  return listBotSubscriptions().filter((b) => {
    const owners = Array.isArray(b.Owner) ? b.Owner : [b.Owner];
    return owners.map(String).includes(String(ownerId));
  });
}

function isSubscriptionExpired(bot, now = moment()) {
  if (!bot?.endTime) return false;
  const end = moment(
    bot.endTime,
    ['YYYY-M-D HH:mm:ss', 'YYYY-MM-DD HH:mm:ss', 'YYYY-M-D H:mm:ss', 'YYYY-MM-DD H:mm:ss'],
    true,
  );
  if (!end.isValid()) return false;
  return now.isAfter(end);
}

module.exports = {
  listBotSubscriptions,
  findSubscriptionByClientId,
  listSubscriptionsForOwner,
  isSubscriptionExpired,
};
