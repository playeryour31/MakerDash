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
const db = new Database("/Database/BotMaker/Permissions.json");

module.exports = {
    name: "permissionss",
    usage: [],
    botPermission: [],
    authorPermission: [],
    cooldowns: [0],
    ownerOnly: false,
    run: async (client, interaction, Text) => {
        try {
            setTimeout(() => {
                interaction.message.edit({ components: [interaction.message.components[0]] }).catch(() => {console.error()});
            }, 500);
            const bots = Tokens.get('Bots') || [];
            const botID = interaction.values[0].split("_")[0].trim();  
            const Selected = interaction.values[0].split("_")[1].trim();  
            const balanceSchema = require('../../../Schema/Balance');
            const userBots = (bots || []).filter(bot => bot.ClientID === botID);
            const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
            if (!isOwner) { 
                return interaction.reply({ 
       			    content: Text.NoPrem,
                    ephemeral: true 
                });
            }
            if (Selected === "add" || Selected === "remove") {

                const commandsData = new Database(`/Database/CommandsData/BotsCommands_${botID}.json`);
                const botCommands = commandsData.get(`commands_${botID}`) || [];

                const commands = botCommands
.filter(command => 
  command &&
  (command.prefix_commandName || command.slash_commandName) &&
  command.type !== "Config"
)                    .map(command => command.prefix_commandName || command.slash_commandName);
           
				const options = commands.map((c, i) => ({
                    label: c,
                    value: `${c}_${Selected}_${botID}_${i}`, 
                }));

                const Menus = [];
                for (let i = 0; i < options.length; i += 25) {
                    const menu = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`${i}_${Selected}_permissions-selector`)
                            .setPlaceholder(Selected === "add" ? "اختر الأمر لإضافة صلاحية" : "اختر الأمر لإزالة صلاحية")
                            .addOptions(options.slice(i, i + 25))
                            .setMinValues(1)
                            .setMaxValues(1)
                    );
                    Menus.push(menu);
                }

                if (commands.length === 0) {
                    return interaction.reply({ 
                        content: `لا توجد أوامر متاحة للبوت الخاص بك.`, 
                        ephemeral: true 
                    });
                }

                await interaction.reply({
                    components: Menus,
                    ephemeral: true
                });
const { EmbedBuilder } = require('discord.js');

} else if (Selected === "list") {
    const commandsData = new Database(`/Database/CommandsData/BotsCommands_${botID}.json`);
    let botCommands = commandsData.get(`commands_${botID}`) || [];

    const all = db.all();

    const commandToPermissions = {};

    for (const element of all) {
        if (!element.ID || !element.data) continue;
        if (!element.ID.includes(botID)) continue;

        const permission = element.data;
        const parts = element.ID.split("_");
        const commandName = parts.slice(1, parts.length - 1).join("_");
        if (!commandToPermissions[commandName]) {
            commandToPermissions[commandName] = new Set();
        }

        commandToPermissions[commandName].add(permission);
    }

    let descriptionText = "## <:Lock:1393590062721007716> قائمة الصلاحيات\n\n";

    for (const [command, permissionsSet] of Object.entries(commandToPermissions)) {
        const perms = Array.from(permissionsSet).join(", ") || "None";
        descriptionText += `-# **${command}**: ${perms}\n`;
    }

    const embed = new EmbedBuilder()
        .setDescription(descriptionText)
        .setColor(Colors.Main);


    await interaction.update({ embeds: [embed], components: [] });
}

        } catch (error) {
            console.error(error);
            if (!interaction.replied) {
                await interaction.reply({ content: "حدث خطأ غير متوقع، الرجاء المحاولة لاحقاً.", ephemeral: true });
            }
        }
    }
};
