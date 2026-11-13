const {
  PermissionFlagsBits,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} = require('discord.js');
const quranDb = require('../../lib/featureDb')('quran');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quran-play')
    .setDescription('Start Quran radio in the configured voice channel.'),
  type: 'Muslim',
  botP: [],
  userP: [PermissionFlagsBits.Administrator],
  P: 'Administrator',
  support: false,
  ownerOnly: false,
  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  async run(client, interaction) {
    const key = `Dashboard_Quran_Action_${client.user.id}`;
    const queue = quranDb.get(key) || [];
    const list = Array.isArray(queue) ? queue : [];
    list.push({ action: 'play', queuedAt: new Date().toISOString() });
    quranDb.set(key, list);
    await interaction.reply({
      content: 'Quran playback starting…',
      allowedMentions: { repliedUser: false },
    });
  },
};
