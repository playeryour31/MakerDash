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
    ChatInputCommandInteraction
} = require("discord.js");

const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const config = require("../../Resources/Config.json");
const moment = require('moment-timezone');
const Tokens = new Database("/Database/Others/Tokens.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const Lan = new Database("/Database/Others/Language.json");
const Prices = new Database("/Database/BotMaker/Prices.json");
const commandsData = require('../../Resources/Aliases.json'); 
let aliasesdb = new Database('/Database/Others/Aliases.json');
const Colors = require("../../Resources/Colors.json");
const OwnerDB = new Database("/Database/Others/OwnerData");
const BlacksDB = new Database("/Database/BotMaker/Blacklisted.json");

module.exports = {
    name: "permissions-selector",
    usage: [],
    botPermission: [],
    authorPermission: [],
    cooldowns: [0],
    ownerOnly: false,
    run: async (client, interaction, Text) => {
        try {

            const bots = Tokens.get('Bots') || [];
            const Command = interaction.values[0].split("_")[0].trim();  
            const botID = interaction.values[0].split("_")[2].trim();  
            const Selected = interaction.values[0].split("_")[1].trim();  
            const balanceSchema = require('../../../Schema/Balance');
            const userBots = (bots || []).filter(bot => bot.ClientID === botID);
            const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
            if (!isOwner) { 
                return interaction.update({ 
       			    content: Text.NoPrem,
					components: [],
                    ephemeral: true 
                });
            }
           const fs = require('fs');
const permissionsDB = new Database("./Maker/Resources/Permissions.json");
 const permissionsList = permissionsDB.get("Permissions") || [];
      if (permissionsList.length === 0) {
        return interaction.reply({ 
          content: `لا توجد صلاحيات متاحة.`, 
          ephemeral: true 
        });
      }

const selectMenu = new StringSelectMenuBuilder()
  .setCustomId(`${Command}_${Selected}_${botID}_` + "permissions-action")
  .setPlaceholder('اختصار الصلاحية المناسبة')
  .addOptions(permissionsList);

await interaction.update({
    components: [new ActionRowBuilder().addComponents(selectMenu)],
    ephemeral: true
});

        } catch (error) {
            console.error(error);
            if (!interaction.replied) {
                await interaction.reply({ content: "حدث خطأ غير متوقع، الرجاء المحاولة لاحقاً.", ephemeral: true });
            }
        }
    }
};
