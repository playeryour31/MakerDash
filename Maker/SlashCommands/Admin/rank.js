const {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your leveling rank card')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Member to check')
        .setRequired(false),
    ),
  type: 'System',
  botP: [],
  userP: [],
  P: '',
  support: false,
  ownerOnly: false,
  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  async run(client, interaction, language, reply, replyEmbeds) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: 'This command only works in a server.',
          ephemeral: true,
        });
      }

      const {
        loadSettings,
        getRank,
      } = require('../../lib/systemLeveling');
      const { composeRankCard } = require('../../lib/rankCard');

      const settings = await loadSettings(client.user.id);
      if (!settings.enabled) {
        return interaction.reply({
          content:
            language === 'Ar'
              ? 'نظام المستويات غير مفعّل في هذا السيرفر.'
              : 'Leveling is disabled on this server.',
          ephemeral: true,
        });
      }

      const target =
        interaction.options.getUser('user') || interaction.user;
      if (target.bot) {
        return interaction.reply({
          content:
            language === 'Ar'
              ? 'البوتات لا تملك XP.'
              : 'Bots do not earn XP.',
          ephemeral: true,
        });
      }

      await interaction.deferReply();
      const rank = await getRank(
        client.user.id,
        interaction.guild.id,
        target.id,
        settings,
      );

      if (settings.rankCard?.enabled !== false) {
        const buffer = await composeRankCard({
          avatarUrl: target.displayAvatarURL({
            extension: 'png',
            size: 256,
            forceStatic: true,
          }),
          username: target.username,
          level: rank.level,
          xp: rank.xp,
          progressXp: rank.progressXp,
          xpToNext: rank.xpToNext,
          rank: rank.rank,
          rankCard: settings.rankCard,
        });
        const file = new AttachmentBuilder(buffer, { name: 'rank.png' });
        return interaction.editReply({ files: [file] });
      }

      const embed = new EmbedBuilder()
        .setColor(interaction.guild.members.me?.displayHexColor || '#5b21b6')
        .setAuthor({
          name: target.username,
          iconURL: target.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          language === 'Ar'
            ? `المستوى **${rank.level}** · الترتيب **#${rank.rank}**\nXP: **${rank.progressXp}/${rank.xpToNext}** (الإجمالي ${rank.xp})`
            : `Level **${rank.level}** · Rank **#${rank.rank}**\nXP: **${rank.progressXp}/${rank.xpToNext}** (total ${rank.xp})`,
        );
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.log(error);
      if (interaction.deferred) {
        return interaction.editReply({
          embeds: replyEmbeds?.errorEmbed ? [replyEmbeds.errorEmbed] : [],
          content: replyEmbeds?.errorEmbed ? undefined : 'Error',
        });
      }
      return interaction.reply({
        embeds: replyEmbeds?.errorEmbed ? [replyEmbeds.errorEmbed] : [],
        ephemeral: true,
      });
    }
  },
};
