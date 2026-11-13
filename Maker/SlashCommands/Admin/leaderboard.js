const {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the server XP leaderboard'),
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

      const { loadSettings, getLeaderboard } = require('../../lib/systemLeveling');
      const settings = await loadSettings(client.user.id);
      if (!settings.enabled || settings.leaderboard?.enabled === false) {
        return interaction.reply({
          content:
            language === 'Ar'
              ? 'لوحة المتصدرين غير مفعّلة.'
              : 'Leaderboard is disabled.',
          ephemeral: true,
        });
      }

      if (
        settings.leaderboard?.isPublic === false &&
        !interaction.memberPermissions?.has('ManageGuild')
      ) {
        return interaction.reply({
          content:
            language === 'Ar'
              ? 'لوحة المتصدرين خاصة للمشرفين.'
              : 'Leaderboard is private (managers only).',
          ephemeral: true,
        });
      }

      await interaction.deferReply();
      const rows = await getLeaderboard(
        client.user.id,
        interaction.guild.id,
        settings,
      );

      if (!rows.length) {
        return interaction.editReply({
          content:
            language === 'Ar'
              ? 'لا يوجد أعضاء في لوحة المتصدرين بعد.'
              : 'No members on the leaderboard yet.',
        });
      }

      const lines = await Promise.all(
        rows.map(async (row) => {
          let name = row.userId;
          try {
            const u = await client.users.fetch(row.userId).catch(() => null);
            if (u) name = u.username;
          } catch {
            /* keep id */
          }
          return `**#${row.rank}** ${name} — Lv.${row.level} · ${row.xp} XP`;
        }),
      );

      const embed = new EmbedBuilder()
        .setColor(interaction.guild.members.me?.displayHexColor || '#5b21b6')
        .setTitle(
          language === 'Ar'
            ? `متصدرو المستويات — ${interaction.guild.name}`
            : `Level leaderboard — ${interaction.guild.name}`,
        )
        .setDescription(lines.join('\n'))
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.log(error);
      if (interaction.deferred) {
        return interaction.editReply({
          embeds: replyEmbeds?.errorEmbed ? [replyEmbeds.errorEmbed] : [],
        });
      }
      return interaction.reply({
        embeds: replyEmbeds?.errorEmbed ? [replyEmbeds.errorEmbed] : [],
        ephemeral: true,
      });
    }
  },
};
