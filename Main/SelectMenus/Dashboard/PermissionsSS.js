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
const db = new Database("/Database/BotMaker/Permissions.json");

module.exports = {
    name: "permissions-action",
    usage: [],
    botPermission: [],
    authorPermission: [],
    cooldowns: [0],
    ownerOnly: false,
    run: async (client, interaction, Text) => {
        try {
            const bots = Tokens.get('Bots') || [];
            const Command = interaction.customId.split("_")[0].trim();  
            const botID = interaction.customId.split("_")[2].trim();  
            const action = interaction.customId.split("_")[1].trim();  
            const permission = interaction.values[0];
            const userBots = (bots || []).filter(bot => bot.ClientID === botID);

      const key = `CommandPermissions_${Command}_${botID}`;
      let currentPermissions = db.get(key) || [];

      let responseText = "";
      if (action === "add") {
        if (currentPermissions.includes(permission)) {
          responseText = `الصلاحية \`${permission}\` موجودة أصلاً للأمر \`${Command}\`.`;
        } else {
          currentPermissions.push(permission);
          db.set(key, currentPermissions);
          responseText = `تمت إضافة الصلاحية \`${permission}\` للأمر \`${Command}\`.`;
        }
      } else if (action === "remove") {
        if (!currentPermissions.includes(permission)) {
          responseText = `الصلاحية \`${permission}\` غير موجودة للأمر \`${Command}\`.`;
        } else {
          currentPermissions = currentPermissions.filter((p) => p !== permission);
          db.set(key, currentPermissions);
          responseText = `تم حذف الصلاحية \`${permission}\` من الأمر \`${Command}\`.`;
        }
      } else {
        responseText = "حدث خطأ: الإجراء غير معروف.";
      }
      const embed = new EmbedBuilder()
        .setTitle(`تحديث صلاحيات الأمر ${Command}`)
        .setDescription(responseText)
        .setColor(Colors.Green);
await interaction.update({
	embeds: [embed],
    components: [],
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
