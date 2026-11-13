const { leaveIfUnauthorized } = require('../lib/guildLock');

/**
 * Reject joins to any guild other than the purchase-locked Server ID.
 */
module.exports.run = async (client, guild) => {
  try {
    await leaveIfUnauthorized(client, guild);
  } catch (err) {
    console.warn(`[guildCreate] guild-lock: ${err?.message || err}`);
  }
};
