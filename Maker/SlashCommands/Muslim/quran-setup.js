const {
  PermissionFlagsBits,
  SlashCommandBuilder,
  ChannelType,
  ChatInputCommandInteraction,
} = require('discord.js');
const quranDb = require('../../lib/featureDb')('quran');
const { readSettings, writeSettings } = require('../../Utils/Quran/quranPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quran-setup')
    .setDescription('Setup Quran voice player channel and radio URL.')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Voice channel for Quran playback')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('radio_url')
        .setDescription('Direct radio stream URL (mp3quran)')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('radio_name')
        .setDescription('Reciter / station name')
        .setRequired(false),
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
    const channel = interaction.options.getChannel('channel');
    const radioUrl = interaction.options.getString('radio_url');
    const radioName =
      interaction.options.getString('radio_name') || 'Quran Radio';
    const cur = readSettings(client.user.id);
    writeSettings(client.user.id, {
      ...cur,
      voiceChannelId: channel.id,
      radioUrl,
      radioName,
      radioId: cur.radioId || 'custom',
      enabled: true,
    });
    quranDb.set(`Dashboard_Quran_Action_${client.user.id}`, [
      ...(quranDb.get(`Dashboard_Quran_Action_${client.user.id}`) || []),
      { action: 'play', queuedAt: new Date().toISOString() },
    ]);
    await interaction.reply({
      content: `Quran player configured for <#${channel.id}> · ${radioName}`,
      allowedMentions: { repliedUser: false },
    });
  },
};
