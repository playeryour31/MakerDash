const { EmbedBuilder } = require('discord.js');
const { Database } = require('st.db');
const messages = new Database('./Maker/Resources/LanguagsProvider.json');
const Botlanguage = new Database('/Database/Others/Language.json');
const logdb = require('../lib/featureDb')('sys_log');

/**
 * Logs member unban (member-unbanned).
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').GuildBan} ban
 */
module.exports.run = async (client, ban) => {
  try {
    if (!ban?.guild || !ban?.user) return;
    if (ban.user.id === client.user?.id) return;

    const language = (await Botlanguage.get(client.user?.id)) || 'En';
    const reply = await messages.get(language);
    const logData =
      logdb.get(`member-unbanned_${ban.guild.id}_${client.user.id}`) || null;
    if (!logData?.channel) return;

    const guild = client.guilds.cache.get(ban.guild.id);
    if (!guild) return;
    const color =
      guild.members.me?.displayColor || logData.color || 'Green';
    const channel =
      ban.guild.channels.cache.get(logData.channel) ||
      (await ban.guild.channels.fetch(logData.channel).catch(() => null));
    if (!channel) return;

    ban.guild
      .fetchAuditLogs({ type: 23, limit: 1 })
      .then(async (audit) => {
        const info = audit.entries.first();
        if (info && info.target?.id !== ban.user.id) return;
        const embed = new EmbedBuilder()
          .setColor(color)
          .setThumbnail(ban.user.avatarURL({ dynamic: true }))
          .setAuthor({
            name: ban.user.username,
            iconURL: ban.user.avatarURL({ dynamic: true }),
          })
          .setTimestamp()
          .setDescription(
            (reply?.Log?.Reply29 || '**:white_check_mark: [USER] was unbanned.**').replace(
              '[USER]',
              ban.user,
            ),
          );
        if (info?.executor) {
          embed.setFooter({
            iconURL: info.executor.avatarURL({ dynamic: true }),
            text: info.executor.username,
          });
          embed.addFields({
            name: reply?.Log?.Field1?.name || 'Moderator',
            value: (reply?.Log?.Field1?.value || '[AUTHOR]').replace(
              '[AUTHOR]',
              info.executor,
            ),
            inline: true,
          });
        }
        if (info?.reason) {
          embed.addFields({
            name: reply?.Log?.Field2?.name || 'Reason',
            value: (reply?.Log?.Field2?.value || '[REASON]').replace(
              '[REASON]',
              info.reason,
            ),
            inline: true,
          });
        }
        await channel.send({ embeds: [embed] });
      })
      .catch(async () => {
        const embed = new EmbedBuilder()
          .setColor(color)
          .setThumbnail(ban.user.avatarURL({ dynamic: true }))
          .setAuthor({
            name: ban.user.username,
            iconURL: ban.user.avatarURL({ dynamic: true }),
          })
          .setTimestamp()
          .setDescription(
            (reply?.Log?.Reply29 || '**:white_check_mark: [USER] was unbanned.**').replace(
              '[USER]',
              ban.user,
            ),
          );
        await channel.send({ embeds: [embed] });
      });
  } catch (_) {}
};
