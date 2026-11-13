/**
 * Dangerous guild update monitoring for Protection bots.
 */
module.exports = {
  event: 'guildUpdate',
  /**
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').Guild} _oldGuild
   * @param {import('discord.js').Guild} newGuild
   */
  async run(client, _oldGuild, newGuild) {
    try {
      const { handleDangerousUpdate } = require('../lib/protectionAdvanced');
      await handleDangerousUpdate(client, newGuild, 'guild');
    } catch (err) {
      console.warn(`[protection] guildUpdate: ${err?.message || err}`);
    }
    try {
      const { handleGuildUpdate } = require('../lib/protectionHardening');
      await handleGuildUpdate(client, _oldGuild, newGuild);
    } catch (err) {
      console.warn(`[protection] anti-server: ${err?.message || err}`);
    }
  },
};
