const {
  Client,
  GatewayIntentBits,
  Partials,
} = require('discord.js');

const DEFAULT_INTENTS = [
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.AutoModerationExecution,
  GatewayIntentBits.AutoModerationConfiguration,
  GatewayIntentBits.DirectMessageReactions,
  GatewayIntentBits.DirectMessageTyping,
  GatewayIntentBits.GuildEmojisAndStickers,
  GatewayIntentBits.GuildIntegrations,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessageTyping,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildPresences,
  GatewayIntentBits.GuildScheduledEvents,
  GatewayIntentBits.GuildWebhooks,
  GatewayIntentBits.GuildVoiceStates,
];

const DEFAULT_PARTIALS = [
  Partials.Channel,
  Partials.Message,
  Partials.User,
  Partials.GuildMember,
  Partials.Reaction,
  Partials.GuildScheduledEvent,
  Partials.ThreadMember,
];

/**
 * Create a Discord.js client with the Maker/customer-bot intent set.
 */
function createClient(overrides = {}) {
  const { intents, partials, rest, ...other } = overrides;
  return new Client({
    ...other,
    intents: intents || DEFAULT_INTENTS,
    partials: partials || DEFAULT_PARTIALS,
    rest: {
      timeout: Number(process.env.DISCORD_REST_TIMEOUT_MS) || 30_000,
      retries: 2,
      ...(rest || {}),
    },
  });
}

module.exports = {
  createClient,
  DEFAULT_INTENTS,
  DEFAULT_PARTIALS,
};
