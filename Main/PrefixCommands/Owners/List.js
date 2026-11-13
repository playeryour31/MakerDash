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
const tokendb = new Database("/Database/Others/BotMakerTokens.json");
const BotMakerDB = new Database("./Database/BotMaker/Balance.json");

module.exports = {
  name: "list", 
  description: "Displays a list of all bots.",
  usage: "[prefix]list",
  botP: [],
  userP: [],
  ownerOnly: true,
  run: async (client, message, args) => {
    try {
      const bots = tokendb.get("Subscriptions") || [];


      const embed = new EmbedBuilder()
        .setColor('#ffffff') 
        .setDescription('## List of All Subscriptions');

      for (const [index, bot] of bots.entries()) {
        const Client = await client.users.fetch(bot.ClientID).catch(() => ({ username: `${bot.Type} #${bot.BotID}` }));
            const data = BotMakerDB.get(`SubscriptionData_${bot.ClientID}`) || null;

        embed.addFields({
          name: `**${index + 1} - ${Client.username}**`,
          value: `-# Time Remaining: ${getTimeRemaining(bot.endTime)}\n-# Price: ${bot.Price} VC\n-# Start Time: ${bot.startTime}\n-# End Time: ${bot.endTime}\n-# Balance: ${data?.Balance || 0}`,
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