/**
 * Build a Discord.js EmbedBuilder for Apply panels from dashboard config.
 * Empty author/footer/thumbnail fall back to guild branding when useServerBranding !== false.
 */
function resolveColor(raw, fallback) {
  if (!raw || typeof raw !== 'string') return fallback;
  const hex = raw.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex}`;
  return fallback;
}

function buildApplyEmbed(EmbedBuilder, server, opts = {}) {
  const embedCfg = opts.embed && typeof opts.embed === 'object' ? opts.embed : {};
  const description =
    embedCfg.description != null && String(embedCfg.description).length
      ? String(embedCfg.description)
      : opts.message || '';
  const useBranding = embedCfg.useServerBranding !== false;
  const guildIcon = server?.iconURL?.({ dynamic: true }) || null;
  const guildName = server?.name || 'Server';
  const fallbackColor =
    server?.members?.me?.displayHexColor || 'DarkButNotBlack';

  const embed = new EmbedBuilder().setColor(
    resolveColor(embedCfg.color, fallbackColor),
  );

  if (embedCfg.title) embed.setTitle(String(embedCfg.title).slice(0, 256));
  if (description) embed.setDescription(String(description).slice(0, 4096));

  const authorName =
    embedCfg.authorName || (useBranding ? guildName : null);
  const authorIcon =
    embedCfg.authorIconUrl || (useBranding ? guildIcon : null);
  if (authorName) {
    embed.setAuthor({
      name: String(authorName).slice(0, 256),
      iconURL: authorIcon || undefined,
    });
  }

  const footerText =
    embedCfg.footerText || (useBranding ? guildName : null);
  const footerIcon =
    embedCfg.footerIconUrl || (useBranding ? guildIcon : null);
  if (footerText) {
    embed.setFooter({
      text: String(footerText).slice(0, 2048),
      iconURL: footerIcon || undefined,
    });
  }

  const thumb =
    embedCfg.thumbnailUrl || (useBranding ? guildIcon : null);
  if (thumb) embed.setThumbnail(thumb);

  if (embedCfg.imageUrl) embed.setImage(String(embedCfg.imageUrl));

  if (embedCfg.timestamp) embed.setTimestamp(new Date());

  const fields = Array.isArray(embedCfg.fields) ? embedCfg.fields : [];
  const cleanFields = fields
    .filter((f) => f && f.name && f.value)
    .slice(0, 25)
    .map((f) => ({
      name: String(f.name).slice(0, 256),
      value: String(f.value).slice(0, 1024),
      inline: Boolean(f.inline),
    }));
  if (cleanFields.length) embed.addFields(cleanFields);

  return embed;
}

function buildApplyButton(ButtonBuilder, ButtonStyle, opts = {}) {
  const label = (opts.buttonLabel || 'تقديم').slice(0, 80);
  const emoji = opts.buttonEmoji ? String(opts.buttonEmoji).trim() : '';
  const colorName = opts.buttonColor || 'Primary';
  const style =
    ButtonStyle[colorName] != null ? ButtonStyle[colorName] : ButtonStyle.Primary;
  const btn = new ButtonBuilder()
    .setCustomId(
      `${opts.requestsChannel}_${opts.applicationRole}_apply`,
    )
    .setStyle(style)
    .setLabel(label);
  if (emoji) {
    try {
      btn.setEmoji(emoji);
    } catch {
      /* invalid emoji — ignore */
    }
  }
  return btn;
}

function panelRecordFromPayload(appmsgId, channelId, data) {
  const { normalizeQuestions, legacyAskFields } = require('./applyQuestions');
  const questions = normalizeQuestions(
    Array.isArray(data.questions)
      ? data.questions
      : [data.ask1, data.ask2, data.ask3, data.ask4, data.ask5],
  );
  const legacy = legacyAskFields(questions);
  return {
    message: data.applicationMessage || data.appMessage || data.embed?.description || '',
    channel: channelId,
    ID: appmsgId,
    ...legacy,
    questions,
    messageType: data.applicationMessageType || data.messageType || 'embed',
    buttonLabel: data.buttonLabel || null,
    buttonEmoji: data.buttonEmoji?.trim?.() || data.buttonEmoji || null,
    buttonColor: data.buttonColor || 'Primary',
    requestsChannel: data.requestsChannel || null,
    applicationRole: data.applicationRole || null,
    embed: data.embed || {
      description: data.applicationMessage || data.appMessage || '',
      useServerBranding: true,
    },
  };
}

module.exports = {
  buildApplyEmbed,
  buildApplyButton,
  panelRecordFromPayload,
  resolveColor,
};
