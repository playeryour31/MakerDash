/**
 * Send System-bot welcome (text / embed / image card) on member join.
 */
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const featureDb = require('./featureDb');
const { composeWelcomeCard, fillTemplate } = require('./welcomeCard');

async function loadWelcomeSettings(botId) {
  const id = String(botId);
  try {
    const { prisma } = require('@maker/database');
    const row = await prisma.featureRecord.findUnique({
      where: {
        namespace_key: { namespace: 'sys_welcome', key: id },
      },
    });
    if (row?.value && typeof row.value === 'object') {
      // Keep local cache warm without queuing another PG write
      try {
        const map = require('../../src/shared/services/featureCache');
        if (typeof map.prime === 'function') {
          map.prime('sys_welcome', id, row.value);
        }
      } catch {
        /* optional */
      }
      return row.value;
    }
  } catch (err) {
    console.warn(`[system-welcome] prisma read: ${err.message}`);
  }
  return featureDb('sys_welcome').get(id) || null;
}

async function sendSystemWelcome(client, member) {
  if (!client?.user?.id || !member?.guild) return;

  const settings = await loadWelcomeSettings(client.user.id);
  if (!settings || !settings.enabled) return;

  const channelId = String(settings.channelId || '');
  if (!channelId) return;

  let channel =
    member.guild.channels.cache.get(channelId) ||
    (await member.guild.channels.fetch(channelId).catch(() => null));
  if (!channel || typeof channel.send !== 'function') return;

  let serverOwner = '';
  try {
    const owner = await member.guild.fetchOwner();
    serverOwner = owner?.user?.username || owner?.displayName || '';
  } catch {
    /* optional */
  }

  const vars = {
    mention: `<@${member.id}>`,
    username: member.user?.username || member.displayName || 'member',
    displayName: member.displayName || member.user?.username || 'member',
    userId: member.id,
    userAvatar: member.user.displayAvatarURL({
      extension: 'png',
      size: 512,
      forceStatic: true,
    }),
    tag: member.user?.tag || member.user?.username || '',
    server: member.guild.name || '',
    serverId: member.guild.id,
    serverIcon: member.guild.iconURL({ size: 128 }) || '',
    serverOwner,
    memberCount: member.guild.memberCount,
    joinedAt: member.joinedAt
      ? member.joinedAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '',
    accountCreated: member.user?.createdAt
      ? member.user.createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '',
  };

  const text = fillTemplate(
    settings.message || 'Welcome {user} to {server}!',
    vars,
  );
  const type = String(settings.type || 'embed').toLowerCase();

  try {
    if (type === 'image') {
      const avatarUrl = member.user.displayAvatarURL({
        extension: 'png',
        size: 512,
        forceStatic: true,
      });
      const buffer = await composeWelcomeCard({
        avatarUrl,
        settings: { ...settings, botId: client.user.id },
        vars,
      });

      if (!buffer) {
        await channel.send({ content: text }).catch(() => {});
        return;
      }

      const file = new AttachmentBuilder(buffer, { name: 'welcome.png' });
      const payload = { files: [file] };
      if (settings.caption !== false) {
        payload.content = text;
      }
      await channel.send(payload);
      return;
    }

    if (type === 'message') {
      await channel.send({ content: text });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(settings.embedColor || '#5865F2')
      .setDescription(text)
      .setThumbnail(
        member.user.displayAvatarURL({ extension: 'png', size: 256 }),
      )
      .setAuthor({
        name: member.user.username,
        iconURL: member.user.displayAvatarURL({ extension: 'png', size: 128 }),
      })
      .setFooter({
        text: member.guild.name,
        iconURL: member.guild.iconURL({ size: 64 }) || undefined,
      })
      .setTimestamp();
    await channel.send({ content: vars.mention, embeds: [embed] });
  } catch (err) {
    console.warn(
      `[system-welcome] ${client.user.id} failed for ${member.id}: ${err.message}`,
    );
  }
}

module.exports = { sendSystemWelcome, loadWelcomeSettings };
