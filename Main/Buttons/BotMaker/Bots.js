const {
  Client,
  Collection,
  Discord,
  createInvite,
  WebhookClient,
  PermissionsBitField,
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
  REST,
  Routes,
  GatewayCloseCodes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} = require("discord.js");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const Prices = new Database("/Database/BotMaker/Prices.json");
const IdsData = new Database("/Database/BotMaker/IDs.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const TokenDB = new Database("/Database/Others/UnusedTokens.json");
const db2 = new Database("/Database/Others/Tokens.json");
const Lan = new Database("/Database/Others/Language.json");
const runDB = new Database("/Database/BotMaker/RunBots.json");
const prefixDB = new Database("/Database/Others/PrefixData");
const OwnerDB = new Database("/Database/Others/OwnerData");
const config = require("../../Resources/Config.json");
const commands = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Commands.json'));
const bots = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Bots.json'));
const Colors = require("../../Resources/Colors.json");
const Config = require("../../Resources/Config.json");
module.exports = {
  name: "continue",
  ownerOnly: false,
  /**
   *
   * @param {ChatInputCommandInteraction} interaction
   */
  run: async (client, interaction, Text) => {
    try {
      let type = interaction.customId.split("_")[0]?.trim();
      let status = interaction.customId.split("_")[1]?.trim();
      let botCommands = [];
      const bot = bots.get(type) || { name: "خاص" };
      const botbuildingdb = new Database("/Database/Others/Building.json");
      const selectedCommandIDs =
        botbuildingdb.get(`buildBot_${interaction.user.id}`) || [];

      let botPrice = 0;

      if (type === "Custom") {
        selectedCommandIDs.forEach((comID) => {
          const com = commands.get(comID);
          botPrice += 10;
        });
        if (status !== "our") {
          botPrice = botPrice > 0 ? botPrice / 2 : 5;
        }
      } else {
        const basePrice =
          Prices.get(`${bot.priceKey}_${interaction.guild.id}`) || 10;
        botPrice = status === "our" ? basePrice : basePrice / 2;
      }

      console.log("botPrice =", botPrice);

      // Show modal immediately — Discord requires a response within ~3s.
      // Balance is validated again in modal-purches-bot (Mongo can be slow here).
      const modal = new ModalBuilder()
        .setCustomId(`${type}_modal-purches-bot_${status}`)
        .setTitle(`بوت ${bot.name || "خاص"}`);
      const token = new TextInputBuilder()
        .setCustomId("token")
        .setLabel("توكن البوت")
        .setRequired(true)
        .setStyle(TextInputStyle.Short);
      const language = new TextInputBuilder()
        .setCustomId("language")
        .setLabel("لغة البوت")
        .setPlaceholder("مثال: Ar, En")
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      const prefix = new TextInputBuilder()
        .setCustomId("prefix")
        .setRequired(true)
        .setMaxLength(3)
        .setLabel("بادئة أوامر البوت")
        .setPlaceholder("مثال: !")
        .setStyle(TextInputStyle.Short);
      const owner = new TextInputBuilder()
        .setCustomId("owner")
        .setLabel("مالك البوت")
        .setPlaceholder("مثال: 123456789012345678")
        .setStyle(TextInputStyle.Short);
      const server = new TextInputBuilder()
        .setCustomId("server")
        .setLabel("خادم البوت الذي سيعمل فيه البوت")
        .setPlaceholder("مثال: 123456789012345678")
        .setStyle(TextInputStyle.Short);

      const the_token = new ActionRowBuilder().addComponents(token);
      const the_lan = new ActionRowBuilder().addComponents(language);
      const the_server = new ActionRowBuilder().addComponents(server);
      const the_prefix = new ActionRowBuilder().addComponents(prefix);
      const the_owner = new ActionRowBuilder().addComponents(owner);
      if (status === "his") {
        modal.addComponents(
          the_token,
          the_lan,
          the_prefix,
          the_owner,
          the_server,
        );
      } else {
        modal.addComponents(the_lan, the_prefix, the_owner, the_server);
      }
      await interaction.showModal(modal);
    } catch (error) {
      console.log(error);
    }
  },
};
