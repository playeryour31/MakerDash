/**
 * Dashboard System auto-responder (sys_auto_responder).
 * Complements legacy slash-command replies in sys_reply.
 */
const featureDb = require('./featureDb');

async function loadAutoResponderSettings(botId) {
  const id = String(botId);
  try {
    const { prisma } = require('@maker/database');
    const row = await prisma.featureRecord.findUnique({
      where: {
        namespace_key: { namespace: 'sys_auto_responder', key: id },
      },
    });
    if (row?.value && typeof row.value === 'object') {
      try {
        const cache = require('../../src/shared/services/featureCache');
        if (typeof cache.prime === 'function') {
          cache.prime('sys_auto_responder', id, row.value);
        }
      } catch {
        /* optional */
      }
      return row.value;
    }
  } catch (err) {
    console.warn(`[auto-responder] prisma read: ${err.message}`);
  }
  return featureDb('sys_auto_responder').get(id) || null;
}

function matchReply(content, reply) {
  const trigger = String(reply?.trigger || '').trim();
  if (!trigger) return false;
  const text = String(content || '');
  if (reply.match === 'exact') {
    return text.trim().toLowerCase() === trigger.toLowerCase();
  }
  return text.toLowerCase().includes(trigger.toLowerCase());
}

function applyPlaceholders(template, message) {
  return String(template || '')
    .replaceAll('{user}', `<@!${message.author.id}>`)
    .replaceAll('{username}', message.author.username)
    .replaceAll('{user.username}', message.author.username)
    .replaceAll('{user.id}', message.author.id)
    .replaceAll('{server}', message.guild?.name || '')
    .replaceAll('{server.name}', message.guild?.name || '')
    .replaceAll('{server.id}', message.guild?.id || '')
    .replaceAll('[User]', `<@!${message.author.id}>`)
    .replaceAll('[UserUsername]', message.author.username)
    .replaceAll('[ServerName]', message.guild?.name || '');
}

/**
 * @returns {Promise<boolean>} true if a reply was sent
 */
async function handleSystemAutoResponder(client, message) {
  if (!client?.user?.id || !message?.guild || message.author?.bot) return false;
  if (!message.content) return false;

  const settings = await loadAutoResponderSettings(client.user.id);
  if (!settings || !settings.enabled) return false;

  const replies = Array.isArray(settings.replies) ? settings.replies : [];
  const hit = replies.find((r) => matchReply(message.content, r));
  if (!hit) return false;

  const response = applyPlaceholders(hit.response, message);
  if (!response) return false;

  try {
    await message.reply({ content: response });
    return true;
  } catch {
    try {
      await message.channel.send({ content: response });
      return true;
    } catch (err) {
      console.warn(
        `[auto-responder] send failed for ${client.user.id}: ${err.message}`,
      );
      return false;
    }
  }
}

module.exports = {
  handleSystemAutoResponder,
  loadAutoResponderSettings,
};
