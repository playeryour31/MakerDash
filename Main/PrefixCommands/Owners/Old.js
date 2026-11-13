const {
  Client,
  Collection,
  Discord,
  createInvite,
  ChannelType,
  WebhookClient,
  PermissionFlagsBits,
  GatewayIntentBits,
  Partials,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  Events,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  GatewayCloseCodes,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} = require("discord.js");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'))
const tokendb = new Database("/Database/Others/Tokens.json");

module.exports = {
  name: "old", 
  description: "Displays the top 3 oldest bots.",
  usage: "[prefix]old",
  botP: [],
  userP: [],
  ownerOnly: true,
  run: async (client, message, args) => {
    try {
      const bots = tokendb.get("Bots") || [];
      const sortedBots = bots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      const topBots = sortedBots.slice(0, 3);

      const embed = new EmbedBuilder()
        .setColor('#ffffff') 
        .setDescription('## Top 3 Oldest Bots');

    for (const [index, bot] of topBots.entries()) {
        const Client = await client.users.fetch(bot.ClientID).catch(() => ({ username: `${bot.Type} #${bot.BotID}` }));

        embed.addFields({
          name: `**${index + 1} - ${Client.username} (${bot.Type})**`,
          value: `-# Time Remaining: ${getTimeRemaining(bot.endTime)}\n-# Price: ${bot.Price} VC\n-# Start Time: ${bot.startTime}\n-# End Time: ${bot.endTime}`,
          inline: false
        });
      }

      message.reply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      message.reply("An error occurred while fetching the bot data.");
    }
  },
};

function getTimeRemaining(endTime) {
  const endDate = new Date(endTime);
  const now = new Date();
  const timeDiff = endDate - now;

  if (timeDiff <= 0) return "Expired";

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}