const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'leaderboard',
  type: 'System',
  botP: [],
  userP: [],
  P: '',
  support: false,
  ownerOnly: false,
  cooldown: 8000,
  async run(client, message, args, language) {
    try {
      if (!message.guild) return;
      const { loadSettings, getLeaderboard } = require('../../lib/systemLeveling');
      const settings = await loadSettings(client.user.id);
      if (!settings.enabled || settings.leaderboard?.enabled === false) {
        return message.reply(
          language === 'Ar'
            ? 'لوحة المتصدرين غير مفعّلة.'
            : 'Leaderboard is disabled.',
        );
      }

      if (
        settings.leaderboard?.isPublic === false &&
        !message.member?.permissions?.has('ManageGuild')
      ) {
        return message.reply(
          language === 'Ar'
            ? 'لوحة المتصدرين خاصة للمشرفين.'
            : 'Leaderboard is private (managers only).',
        );
      }

      const rows = await getLeaderboard(
        client.user.id,
        message.guild.id,
        settings,
      );
      if (!rows.length) {
        return message.reply(
          language === 'Ar'
            ? 'لا يوجد أعضاء في لوحة المتصدرين بعد.'
            : 'No members on the leaderboard yet.',
        );
      }

      const lines = await Promise.all(
        rows.map(async (row) => {
          let name = row.userId;
          try {
            const u = await client.users.fetch(row.userId).catch(() => null);
            if (u) name = u.username;
          } catch {
            /* keep */
          }
          return `**#${row.rank}** ${name} — Lv.${row.level} · ${row.xp} XP`;
        }),
      );

      const embed = new EmbedBuilder()
        .setColor(message.guild.members.me?.displayHexColor || '#5b21b6')
        .setTitle(
          language === 'Ar'
            ? `متصدرو المستويات — ${message.guild.name}`
            : `Level leaderboard — ${message.guild.name}`,
        )
        .setDescription(lines.join('\n'));

      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.log(error);
    }
  },
};
