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
const tokensdb = new Database("/Database/Others/Tokens.json");
const BotMakerDB = new Database("./Database/BotMaker/Balance.json");

module.exports = {
  name: "time",
  description: "Displays a time of a bots.",
  usage: "[prefix]time",
  botP: [],
  userP: [],
  ownerOnly: true,
  run: async (client, message, args) => {
    try {
      const botID = message.content.split(' ').slice(1).join(' ') || client.user.id;
      const subscriptionData = await tokendb.get("Subscriptions");
      const botData = await tokensdb.get("Bots");
      let data = [];
      if (subscriptionData && subscriptionData.length > 0) {
        data = subscriptionData.filter(da => da.ClientID === botID);
      }
      if (data.length === 0 && botData && botData.length > 0) {
        data = botData.filter(da => da.ClientID === botID);
      }
      if (!data.length) {
        return message.reply({ content: "No bots found in the database.", ephemeral: true });
      }
      const DB = data.filter(da => da.ClientID === botID);
       if (!DB.length) {
        return message.reply({ content: `No subscription data found for bot with ID ${botID}.`, ephemeral: true });
      }

      const endTime = new Date(DB[0].endTime);
      const currentTime = new Date();
      const timeDiff = endTime - currentTime;
      if (timeDiff <= 0) {
        return message.reply({ content: "The subscription has expired.", ephemeral: true });
      }
      const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((timeDiff % (1000 * 60)) / 1000);

      message.reply({
        content: `**${daysLeft} days, ${hoursLeft} hours, ${minutesLeft} minutes, and ${secondsLeft} seconds.**`,
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error(error);
      message.reply("An error occurred while fetching the bot data.");
    }
  },
};