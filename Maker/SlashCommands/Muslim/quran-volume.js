const {
  PermissionFlagsBits,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} = require('discord.js');
const quranDb = require('../../lib/featureDb')('quran');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quran-volume')
    .setDescription('Set Quran player volume (0-100).')
    .addIntegerOption((option) =>
      option
        .setName('level')
        .setDescription('Volume level 0-100')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100),
    ),
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
    const level = interaction.options.getInteger('level');
    const key = `Dashboard_Quran_Action_${client.user.id}`;
    const queue = quranDb.get(key) || [];
    const list = Array.isArray(queue) ? queue : [];
    list.push({
      action: 'setVolume',
      volume: level,
      queuedAt: new Date().toISOString(),
    });
    quranDb.set(key, list);
    await interaction.reply({
      content: `Quran volume set to ${level}%`,
      allowedMentions: { repliedUser: false },
    });
  },
};
