/**
 * Bridge prefix message invocations into existing slash command modules.
 * Builds a duck-typed ChatInputCommandInteraction from message + args.
 */

const ApplicationCommandOptionType = {
  Subcommand: 1,
  SubcommandGroup: 2,
  String: 3,
  Integer: 4,
  Boolean: 5,
  User: 6,
  Channel: 7,
  Role: 8,
  Mentionable: 9,
  Number: 10,
  Attachment: 11,
};

function optionDefs(command) {
  try {
    const json =
      typeof command?.data?.toJSON === 'function'
        ? command.data.toJSON()
        : command?.data;
    return Array.isArray(json?.options) ? json.options : [];
  } catch {
    return [];
  }
}

function isBridgeable(command) {
  if (command?.bridgeable === false) return false;
  const opts = optionDefs(command);
  if (opts.some((o) => o.type === ApplicationCommandOptionType.Attachment)) {
    return false;
  }
  if (opts.some((o) => o.type === ApplicationCommandOptionType.Subcommand || o.type === ApplicationCommandOptionType.SubcommandGroup)) {
    return false;
  }
  return true;
}

function parseKvArgs(args) {
  /** @type {Map<string, string>} */
  const named = new Map();
  const positional = [];
  for (const raw of args) {
    const m = String(raw).match(/^([a-zA-Z0-9_-]+):(.+)$/);
    if (m) named.set(m[1].toLowerCase(), m[2]);
    else positional.push(raw);
  }
  return { named, positional };
}

function snowflake(s) {
  const m = String(s || '').match(/^(\d{16,20})$/);
  return m ? m[1] : null;
}

function resolveUser(guild, token) {
  if (!token || !guild) return null;
  const mention = String(token).match(/^<@!?(\d+)>$/);
  const id = mention ? mention[1] : snowflake(token);
  if (id) return guild.members.cache.get(id)?.user || null;
  const lower = String(token).toLowerCase();
  const byTag = guild.members.cache.find(
    (m) =>
      m.user.username?.toLowerCase() === lower ||
      m.displayName?.toLowerCase() === lower,
  );
  return byTag?.user || null;
}

function resolveChannel(guild, token) {
  if (!token || !guild) return null;
  const mention = String(token).match(/^<#(\d+)>$/);
  const id = mention ? mention[1] : snowflake(token);
  if (id) return guild.channels.cache.get(id) || null;
  const lower = String(token).toLowerCase();
  return (
    guild.channels.cache.find((c) => c.name?.toLowerCase() === lower) || null
  );
}

function resolveRole(guild, token) {
  if (!token || !guild) return null;
  const mention = String(token).match(/^<@&(\d+)>$/);
  const id = mention ? mention[1] : snowflake(token);
  if (id) return guild.roles.cache.get(id) || null;
  const lower = String(token).toLowerCase();
  return (
    guild.roles.cache.find((r) => r.name?.toLowerCase() === lower) || null
  );
}

function coerceValue(opt, raw, guild) {
  if (raw == null || raw === '') return null;
  const t = opt.type;
  if (t === ApplicationCommandOptionType.String) return String(raw);
  if (t === ApplicationCommandOptionType.Integer) {
    const n = parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : null;
  }
  if (t === ApplicationCommandOptionType.Number) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (t === ApplicationCommandOptionType.Boolean) {
    const s = String(raw).toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
    return null;
  }
  if (t === ApplicationCommandOptionType.User) return resolveUser(guild, raw);
  if (t === ApplicationCommandOptionType.Channel)
    return resolveChannel(guild, raw);
  if (t === ApplicationCommandOptionType.Role) return resolveRole(guild, raw);
  if (t === ApplicationCommandOptionType.Mentionable) {
    return (
      resolveUser(guild, raw) ||
      resolveRole(guild, raw) ||
      null
    );
  }
  return String(raw);
}

/**
 * @returns {{ ok: true, values: Map<string, any> } | { ok: false, error: string }}
 */
function parseOptionsFromArgs(command, message, args) {
  const opts = optionDefs(command);
  const { named, positional } = parseKvArgs(args);
  const values = new Map();
  let posIdx = 0;

  for (const opt of opts) {
    const name = String(opt.name || '').toLowerCase();
    let raw = named.has(name) ? named.get(name) : undefined;
    if (raw === undefined && posIdx < positional.length) {
      // Mentions for entity options can consume message.mentions first
      if (
        opt.type === ApplicationCommandOptionType.User &&
        message.mentions?.users?.size
      ) {
        const u = message.mentions.users.at(posIdx);
        if (u) {
          values.set(name, u);
          posIdx++;
          continue;
        }
      }
      if (
        opt.type === ApplicationCommandOptionType.Channel &&
        message.mentions?.channels?.size
      ) {
        const c = message.mentions.channels.at(posIdx);
        if (c) {
          values.set(name, c);
          posIdx++;
          continue;
        }
      }
      if (
        opt.type === ApplicationCommandOptionType.Role &&
        message.mentions?.roles?.size
      ) {
        const r = message.mentions.roles.at(posIdx);
        if (r) {
          values.set(name, r);
          posIdx++;
          continue;
        }
      }
      raw = positional[posIdx++];
    }
    if (raw === undefined || raw === '') {
      if (opt.required) {
        return {
          ok: false,
          error: `Missing required option: ${opt.name}`,
        };
      }
      continue;
    }
    const coerced = coerceValue(opt, raw, message.guild);
    if (coerced == null && opt.required) {
      return {
        ok: false,
        error: `Invalid value for option: ${opt.name}`,
      };
    }
    if (coerced != null) values.set(name, coerced);
  }

  return { ok: true, values };
}

function createSyntheticInteraction(message, command, values) {
  let deferred = false;
  let replied = false;
  let lastPayload = null;

  const send = async (payload = {}) => {
    const data =
      typeof payload === 'string' ? { content: payload } : { ...payload };
    delete data.ephemeral;
    delete data.fetchReply;
    if (!replied && !deferred) {
      replied = true;
      lastPayload = data;
      return message.reply({
        ...data,
        allowedMentions: data.allowedMentions || { repliedUser: false },
      });
    }
    lastPayload = data;
    return message.channel.send(data);
  };

  const options = {
    getString(name) {
      const v = values.get(String(name).toLowerCase());
      return v == null ? null : String(v);
    },
    getInteger(name) {
      const v = values.get(String(name).toLowerCase());
      return typeof v === 'number' ? Math.trunc(v) : null;
    },
    getNumber(name) {
      const v = values.get(String(name).toLowerCase());
      return typeof v === 'number' ? v : null;
    },
    getBoolean(name) {
      const v = values.get(String(name).toLowerCase());
      return typeof v === 'boolean' ? v : null;
    },
    getUser(name) {
      const v = values.get(String(name).toLowerCase());
      return v && v.id && v.username !== undefined ? v : null;
    },
    getMember(name) {
      const u = options.getUser(name);
      if (!u || !message.guild) return null;
      return message.guild.members.cache.get(u.id) || null;
    },
    getChannel(name) {
      const v = values.get(String(name).toLowerCase());
      return v && v.id ? v : null;
    },
    getRole(name) {
      const v = values.get(String(name).toLowerCase());
      return v && v.id && v.name !== undefined && v.members ? v : v?.id ? v : null;
    },
    getMentionable(name) {
      return (
        options.getUser(name) ||
        options.getRole(name) ||
        null
      );
    },
    getAttachment() {
      return null;
    },
    getSubcommand() {
      return null;
    },
    getSubcommandGroup() {
      return null;
    },
  };

  return {
    id: `bridge_${message.id}`,
    commandName: command?.data?.name || command?.name,
    options,
    user: message.author,
    member: message.member,
    guild: message.guild,
    guildId: message.guild?.id,
    channel: message.channel,
    channelId: message.channel?.id,
    client: message.client,
    createdTimestamp: message.createdTimestamp,
    isCommand: () => true,
    isChatInputCommand: () => true,
    inGuild: () => Boolean(message.guild),
    deferred,
    replied,
    async reply(payload) {
      return send(payload);
    },
    async deferReply() {
      deferred = true;
      this.deferred = true;
      return undefined;
    },
    async editReply(payload) {
      return send(payload);
    },
    async followUp(payload) {
      return send(payload);
    },
    async deleteReply() {
      return undefined;
    },
    async showModal() {
      throw new Error('Modal interactions are not supported via prefix bridge');
    },
    get _lastPayload() {
      return lastPayload;
    },
  };
}

/**
 * Run a slash command module from a prefix message.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function runSlashFromPrefix(
  client,
  message,
  args,
  slashCommand,
  language,
  reply,
  embeds,
  name,
) {
  if (!slashCommand || typeof slashCommand.run !== 'function') {
    return { ok: false, error: 'Command not found' };
  }
  if (!isBridgeable(slashCommand)) {
    return {
      ok: false,
      error: 'This command cannot be used with prefix (use slash)',
    };
  }
  const parsed = parseOptionsFromArgs(slashCommand, message, args);
  if (!parsed.ok) return parsed;

  const interaction = createSyntheticInteraction(
    message,
    slashCommand,
    parsed.values,
  );
  await slashCommand.run(
    client,
    interaction,
    language,
    reply,
    embeds,
    name || slashCommand.data?.name,
  );
  return { ok: true };
}

/**
 * Thin slash wrapper that invokes an existing prefix command module.
 */
function createPrefixSlashWrapper(prefixCommand, slashName) {
  const { SlashCommandBuilder } = require('discord.js');
  const name = String(slashName || prefixCommand.name);
  return {
    data: new SlashCommandBuilder()
      .setName(name)
      .setDescription(
        prefixCommand.description ||
          `Run ${name} (bridged from prefix command)`,
      ),
    type: prefixCommand.type,
    botP: prefixCommand.botP || [],
    userP: prefixCommand.userP || [],
    P: prefixCommand.P || '',
    ownerOnly: Boolean(prefixCommand.ownerOnly),
    cooldown: prefixCommand.cooldown,
    bridgedFromPrefix: true,
    async run(client, interaction, language, reply, embeds, cmdName) {
      const args = [];
      // Zero-option bridge: no positional args from slash
      const fakeMessage = {
        ...interaction,
        author: interaction.user,
        member: interaction.member,
        guild: interaction.guild,
        channel: interaction.channel,
        client,
        content: `/${name}`,
        mentions: {
          users: { size: 0, at: () => null },
          channels: { size: 0, at: () => null },
          roles: { size: 0, at: () => null },
        },
        reply: (payload) => interaction.reply(payload),
        delete: async () => undefined,
        createMessageComponentCollector:
          interaction.channel?.createMessageComponentCollector?.bind(
            interaction.channel,
          ),
      };
      // Prefer interaction.reply for first response — wrap message.reply
      fakeMessage.reply = async (payload) => {
        const data =
          typeof payload === 'string' ? { content: payload } : { ...payload };
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(data);
        }
        return interaction.reply(data);
      };
      await prefixCommand.run(
        client,
        fakeMessage,
        args,
        language,
        reply,
        embeds,
        cmdName || name,
        [],
      );
    },
  };
}

module.exports = {
  isBridgeable,
  runSlashFromPrefix,
  createPrefixSlashWrapper,
  parseOptionsFromArgs,
  optionDefs,
};
