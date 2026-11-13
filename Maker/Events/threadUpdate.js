const { EmbedBuilder } = require('discord.js');
const { Database } = require('st.db');
const messages = new Database('./Maker/Resources/LanguagsProvider.json');
const Botlanguage = new Database('/Database/Others/Language.json');
const logdb = require('../lib/featureDb')('sys_log');

/**
 * Thread update logs.
 */
module.exports.run = async (client, oldThread, newThread) => {
  try {
    if (!newThread?.guild) return;

    const log =
      logdb.get(
        `thread-updated_${newThread.guild.id}_${client.user.id}`,
      ) || null;
    if (!log?.channel) return;

    const changed =
      oldThread.name !== newThread.name ||
      oldThread.archived !== newThread.archived ||
      oldThread.locked !== newThread.locked ||
      oldThread.autoArchiveDuration !== newThread.autoArchiveDuration;
    if (!changed) return;

    const language = (await Botlanguage.get(client.user?.id)) || 'En';
    const reply = await messages.get(language);
    const guild = client.guilds.cache.get(newThread.guild.id);
    const color =
      guild?.members?.me?.displayColor || log.color || 'Green';
    const channel =
      newThread.guild.channels.cache.get(log.channel) ||
      (await newThread.guild.channels.fetch(log.channel).catch(() => null));
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: newThread.guild.name,
        iconURL: newThread.guild.iconURL({ dynamic: true }),
      })
      .setTimestamp()
      .setDescription(
        (
          reply?.Log?.Reply34 ||
          '🧵 Thread updated: `[OLD]` → `[NEW]`'
        )
          .replace('[OLD]', oldThread.name)
          .replace('[NEW]', newThread.name),
      );
    await channel.send({ embeds: [embed] });
  } catch (_) {}
};
