const { EmbedBuilder, ChannelType } = require('discord.js');
const { Database } = require('st.db');
const messages = new Database('./Maker/Resources/LanguagsProvider.json');
const Botlanguage = new Database('/Database/Others/Language.json');
const logdb = require('../lib/featureDb')('sys_log');

/**
 * Channel update + permission overwrite logs.
 */
module.exports.run = async (client, oldChannel, newChannel) => {
  try {
    if (!newChannel?.guild) return;
    if (
      newChannel.type === ChannelType.PublicThread ||
      newChannel.type === ChannelType.PrivateThread ||
      newChannel.type === ChannelType.AnnouncementThread
    ) {
      return;
    }

    const language = (await Botlanguage.get(client.user?.id)) || 'En';
    const reply = await messages.get(language);
    const guild = client.guilds.cache.get(newChannel.guild.id);

    const permsChanged =
      JSON.stringify(
        [...(oldChannel.permissionOverwrites?.cache?.values?.() || [])].map(
          (o) => ({ id: o.id, allow: String(o.allow.bitfield), deny: String(o.deny.bitfield) }),
        ),
      ) !==
      JSON.stringify(
        [...(newChannel.permissionOverwrites?.cache?.values?.() || [])].map(
          (o) => ({ id: o.id, allow: String(o.allow.bitfield), deny: String(o.deny.bitfield) }),
        ),
      );

    const settingsChanged =
      oldChannel.name !== newChannel.name ||
      oldChannel.topic !== newChannel.topic ||
      oldChannel.nsfw !== newChannel.nsfw ||
      oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser ||
      oldChannel.parentId !== newChannel.parentId;

    async function sendLog(key, description) {
      const log =
        logdb.get(`${key}_${newChannel.guild.id}_${client.user.id}`) || null;
      if (!log?.channel) return;
      const color =
        guild?.members?.me?.displayColor || log.color || 'Green';
      const channel =
        newChannel.guild.channels.cache.get(log.channel) ||
        (await newChannel.guild.channels.fetch(log.channel).catch(() => null));
      if (!channel) return;
      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
          name: newChannel.guild.name,
          iconURL: newChannel.guild.iconURL({ dynamic: true }),
        })
        .setTimestamp()
        .setDescription(description);
      await channel.send({ embeds: [embed] });
    }

    if (permsChanged) {
      await sendLog(
        'channel-prems-updated',
        (
          reply?.Log?.Reply32 ||
          ':lock: Channel permissions updated: `[CHANNEL]`'
        ).replace('[CHANNEL]', newChannel.name),
      );
    }

    if (settingsChanged) {
      await sendLog(
        'channel-updated',
        (
          reply?.Log?.Reply33 ||
          ':house: Channel updated: `[OLD]` → `[NEW]`'
        )
          .replace('[OLD]', oldChannel.name)
          .replace('[NEW]', newChannel.name),
      );
    }
  } catch (_) {}
};
