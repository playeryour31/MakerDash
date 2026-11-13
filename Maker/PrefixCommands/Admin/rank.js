const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'rank',
  type: 'System',
  botP: [],
  userP: [],
  P: '',
  support: false,
  ownerOnly: false,
  cooldown: 5000,
  async run(client, message, args, language) {
    try {
      if (!message.guild) return;
      const { loadSettings, getRank } = require('../../lib/systemLeveling');
      const { composeRankCard } = require('../../lib/rankCard');
      const settings = await loadSettings(client.user.id);
      if (!settings.enabled) {
        return message.reply(
          language === 'Ar'
            ? 'نظام المستويات غير مفعّل في هذا السيرفر.'
            : 'Leveling is disabled on this server.',
        );
      }

      const target =
        message.mentions.users.first() ||
        (args[0] && (await client.users.fetch(args[0]).catch(() => null))) ||
        message.author;
      if (target.bot) {
        return message.reply(
          language === 'Ar' ? 'البوتات لا تملك XP.' : 'Bots do not earn XP.',
        );
      }

      const rank = await getRank(
        client.user.id,
        message.guild.id,
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
        return message.reply({ files: [file] });
      }

      const embed = new EmbedBuilder()
        .setColor(message.guild.members.me?.displayHexColor || '#5b21b6')
        .setAuthor({
          name: target.username,
          iconURL: target.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          `Level **${rank.level}** · Rank **#${rank.rank}**\nXP: **${rank.progressXp}/${rank.xpToNext}** (total ${rank.xp})`,
        );
      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.log(error);
    }
  },
};
