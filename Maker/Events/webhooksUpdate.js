/**
 * Anti-webhook / webhook abuse monitoring for Protection bots.
 */
module.exports = {
  event: 'webhooksUpdate',
  /**
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').TextChannel} channel
   */
  async run(client, channel) {
    try {
      const { handleWebhooksUpdate } = require('../lib/protectionAdvanced');
      await handleWebhooksUpdate(client, channel);
    } catch (err) {
      console.warn(`[protection] webhooksUpdate: ${err?.message || err}`);
    }
  },
};
