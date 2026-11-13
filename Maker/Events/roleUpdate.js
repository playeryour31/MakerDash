/**
 * Dangerous role permission elevation monitoring for Protection bots
 * + role-updated logging for Log bots.
 */
const { EmbedBuilder } = require('discord.js');
const { Database } = require('st.db');
const messages = new Database('./Maker/Resources/LanguagsProvider.json');
const Botlanguage = new Database('/Database/Others/Language.json');
const logdb = require('../lib/featureDb')('sys_log');

module.exports = {
  event: 'roleUpdate',
  /**
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').Role} oldRole
   * @param {import('discord.js').Role} newRole
   */
  async run(client, oldRole, newRole) {
    try {
      const { handleDangerousUpdate } = require('../lib/protectionAdvanced');
      await handleDangerousUpdate(client, newRole, 'role');
    } catch (err) {
      console.warn(`[protection] roleUpdate: ${err?.message || err}`);
    }
    try {
      const { handleRoleUpdate } = require('../lib/protectionHardening');
      await handleRoleUpdate(client, oldRole, newRole);
    } catch (err) {
      console.warn(`[protection] anti-perms role: ${err?.message || err}`);
    }

    try {
      if (!newRole?.guild) return;
      const log =
        logdb.get(
          `role-updated_${newRole.guild.id}_${client.user.id}`,
        ) || null;
      if (!log?.channel) return;

      const changed =
        oldRole.name !== newRole.name ||
        oldRole.color !== newRole.color ||
        oldRole.hoist !== newRole.hoist ||
        oldRole.mentionable !== newRole.mentionable ||
        oldRole.permissions.bitfield !== newRole.permissions.bitfield;
      if (!changed) return;

      const language = (await Botlanguage.get(client.user?.id)) || 'En';
      const reply = await messages.get(language);
      const guild = client.guilds.cache.get(newRole.guild.id);
      const color =
        guild?.members?.me?.displayColor || log.color || 'Green';
      const channel =
        newRole.guild.channels.cache.get(log.channel) ||
        (await newRole.guild.channels.fetch(log.channel).catch(() => null));
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
          name: newRole.guild.name,
          iconURL: newRole.guild.iconURL({ dynamic: true }),
        })
        .setTimestamp()
        .setDescription(
          (
            reply?.Log?.Reply31 ||
            ':family_mmb: Role updated: `[ROLE]` (`[OLD]` → `[NEW]`)'
          )
            .replace('[ROLE]', newRole.name)
            .replace('[OLD]', oldRole.name)
            .replace('[NEW]', newRole.name),
        );
      await channel.send({ embeds: [embed] });
    } catch (_) {}
  },
};
