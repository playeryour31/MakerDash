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
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const fs = require("fs");
const path = require("path");
const botsdb = new Database("/Database/Others/Tokens.json");
const commandsdb = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Commands.json'));
const rundb = new Database("./Database/BotMaker/RunBots.json");

module.exports = {
  name: "fix",
  description: "fixing a bot.",
  usage: "[prefix]fix",
  botP: [],
  userP: [],
  ownerOnly: true,
  run: async (client, message, args) => {
    try {
      const botID = message.content.split(' ').slice(1).join(' ') || client.user.id;
      const bots = botsdb.get("Bots") || [];
      const DB = bots.filter(da => da.ClientID === botID);

      if (!DB.length) {
        return message.reply({ content: `No subscription data found for bot with ID ${botID}.`, ephemeral: true });
      }

      const bot = DB[0];

      if (bots.length === 0) {
        return message.reply({ content: "No bots found!" });
      }

      const Client = await client.users.fetch(bot.ClientID).catch(() => ({ username: `${bot.Type} #${bot.BotID}` }));

      const msg = await message.reply({ content: `Fixing ${Client.username}...` });

      await rundb.set(bot.ClientID, true); 

      const type = bot.Type || null;
      if (!type) return;

      const botCommandsDb = new Database(`/Database/CommandsData/BotsCommands_${bot.ClientID}.json`);
      let commandsArr = [];

      const configCommands = commandsdb.get("config");
      if (configCommands) {
        commandsArr.push(...configCommands);
      }

      if (commandsdb.get(type)) {
        commandsdb.get(type).forEach((comID) => {
          const com = commandsdb.get(comID);
          if (com) commandsArr.push(com);
        });
      }

      await botCommandsDb.set(`commands_${bot.ClientID}`, commandsArr);

      return msg.edit({ content: `Done updating ${Client.username}` });

    } catch (error) {
      console.error(error);
      message.reply("An error occurred while fetching the bot data.");
    }
  },
};
