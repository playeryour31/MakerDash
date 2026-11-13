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
const db = new Database("/Database/BotMaker/RunBots.json");
const tokendb = new Database("/Database/Others/BotMakerTokens.json");
const tokensdb = new Database("/Database/Others/Tokens.json");
const BotMakerDB = new Database("./Database/BotMaker/Balance.json");

module.exports = {
  name: "restart",
  description: "restart a bot",
  usage: "[prefix]restart ID",
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
      const clientUser = await client.users.fetch(DB[0].ClientID).catch(() => ({ username: `${DB[0].Type} #${DB[0].BotID}` }));

      const replyMessage = await message.reply({ content: `Restarting bot: ${clientUser.username}...` });
      await db.set(botID, false);
      setTimeout(async () => {
        await db.set(botID, true);
        await replyMessage.edit({ content: `<:signcheck:1293713968266874952> Successfully restarted bot: ${clientUser.username}.` });
		}, 10000);	
    } catch (error) {
      console.error(error);
      message.reply("<:signdelete:1293713971945144493> An error occurred while processing the bot restart. #1033");
    }
  },
};