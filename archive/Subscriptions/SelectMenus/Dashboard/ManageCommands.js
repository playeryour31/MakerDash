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

const { Database } = require("st.db");
const config = require("../../../Main/Resources/Config.json");
const moment = require('moment-timezone');
const Tokens = new Database("/Database/Others/Tokens.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const Lan = new Database("/Database/Others/Language.json");
const Prices = new Database("/Database/BotMaker/Prices.json");
const commandsData = require('../../../Main/Resources/Aliases.json');
let aliasesdb = new Database('/Database/Others/Aliases.json');
const Colors = require("../../../Main/Resources/Colors.json");
const OwnerDB = new Database("/Database/Others/OwnerData");
let botbuildingdb = new Database('/Database/Others/CommandStatus.json');

module.exports = {
    name: "manage-commands",
    usage: [],
    botPermission: [],
    authorPermission: [],
    cooldowns: [0],
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            const bots = Tokens.get('Bots') || [];
            const botID = interaction.values[0].split("_")[0].trim();  
            const Selected = interaction.values[0].split("_")[1].trim();
const userBots = (bots || []).filter(bot => bot.ClientID === botID);
const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
if (!isOwner) { 
    return interaction.reply({ 
        content: 'You do not have permission to manage this bot.', 
        ephemeral: true 
    });
}

            if (Selected === "addaliases" || Selected === "renaliases") {
                const commandsData = new Database(`/Database/CommandsData/BotsCommands_${botID}.json`);
                let botCommands = commandsData.get(`commands_${botID}`);
                let commands = [];
                botCommands.forEach(command => {
                    if (command.prefix == true) {
                        commands.push(command.prefix_commandName);
                    }
                });

                const allAliases = aliasesdb.all();
                let aliasCounts = {};

                for (const element of allAliases) {
                    if (!element.ID || !element.data) continue;
                    if (!element.ID.includes(botID)) continue;

                    const commandName = element.data;
                    if (!aliasCounts[commandName]) {
                        aliasCounts[commandName] = [];
                    }
                    aliasCounts[commandName].push(element.ID.split("_")[0]);
                }

                const options = commands.map(c => ({
                    label: c,
                    value: `${c}_${Selected === "addaliases" ? "add" : "remove"}_${botID}`,
                    description: `Aliases: ${aliasCounts[c] ? aliasCounts[c].length : 0}`
                }));

                const Menus = [];
                for (let i = 0; i < options.length; i += 25) {
                    const menu = options.slice(i, i + 25);
                    const cmenu = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`${i}_${Selected === "addaliases" ? "add" : "remove"}_aliases-selector`)
                                .setPlaceholder(Selected === "addaliases" ? "Select the command to add aliases" : "Select the command to remove aliases")
                                .addOptions(menu)
                                .setMinValues(1)
                                .setMaxValues(1)
                        );
                    Menus.push(cmenu);
                }

                if (commands.length === 0) {
                    return interaction.reply({ 
                        content: `No commands available for your bot.`, 
                        ephemeral: true 
                    });
                }

                await interaction.reply({
                    components: Menus,
                    ephemeral: true
                });

            } else if (Selected === "all") {
                const allData = aliasesdb.all();
                if (!allData || allData.length === 0) {
                    return interaction.reply({
                        content: "There are no aliases stored!",
                        ephemeral: true
                    });
                }

                const commandAliases = {};

                for (const element of allData) {
                    if (!element.ID || !element.data) continue;
                    if (!element.ID.includes(botID)) continue;

                    const commandName = element.data;

                    let alias = element.ID;
                    if (alias.includes("_")) {
                        alias = alias.split("_")[0];
                    }

                    if (!commandAliases[commandName]) {
                        commandAliases[commandName] = [];
                    }

                    if (!commandAliases[commandName].includes(alias)) {
                        commandAliases[commandName].push(alias);
                    }
                }

                let replyList = "";
                for (const command in commandAliases) {
                    const aliasesList = commandAliases[command].join(", ");
                    replyList += `**${command}**: ${aliasesList}\n`;
                }

                if (!replyList) {
                    return interaction.reply({
                        content: "There are no aliases stored!",
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(Colors.Main)
                    .setDescription("## <:List:1342283661319602347> Aliases List\n" + replyList);

                return interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (Selected === "enabledcommands" || Selected === "disabledcommands") {
                const commandsData = new Database(`/Database/CommandsData/BotsCommands_${botID}.json`);
                let botCommands = commandsData.get(`commands_${botID}`);
                let commands = [];
                botCommands.forEach(command => {
                    if (command) {
                        commands.push(command.prefix_commandName);
                    }
                });
const options = commands
    .filter(c => c && c.trim() !== "")
    .map(c => {
        const status = botbuildingdb.get(`Status_${botID}_${c}`);
        const isEnabled = status === undefined ? true : status;

return {
    label: c,
    emoji: isEnabled ? "🟢" : "🔴",
    value: `${c}_${Selected === "enabledcommands" ? "enable" : "disable"}_${botID}`,
};
    });

const Menus = [];
for (let i = 0; i < options.length; i += 25) {
    const menu = options.slice(i, i + 25);
    const cmenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${i}_${Selected === "enabledcommands" ? "enable" : "disable"}_commands-selector`)
                .setPlaceholder(Selected === "enabledcommands" ? "Select the command to enable" : "Select the command to disable")
                .addOptions(menu)
                .setMinValues(1)
                .setMaxValues(1)
        );
    Menus.push(cmenu);
}

                if (commands.length === 0) {
                    return interaction.reply({ 
                        content: `No commands available for your bot.`, 
                        ephemeral: true 
                    });
                }

                await interaction.reply({
                    components: Menus,
                    ephemeral: true
                });

            } else if (Selected === "disabledchannels") {

                const commandsData = new Database(`/Database/CommandsData/BotsCommands_${botID}.json`);
                let botCommands = commandsData.get(`commands_${botID}`) || [];
let commands = botCommands
    .filter(command => command && command.prefix_commandName && command.prefix_commandName.trim() !== "")
    .map(command => ({
        label: command.prefix_commandName,
        value: `${command.prefix_commandName}_channel_${botID}`
    }));


                const Menus = [];
                for (let i = 0; i < commands.length; i += 25) {
                    const menu = commands.slice(i, i + 25);
                    const cmenu = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`${i}_channel_commands-selector`)
                                .setPlaceholder("Select a command to configure channels")
                                .addOptions(menu)
                                .setMinValues(1)
                                .setMaxValues(1)
                        );
                    Menus.push(cmenu);
                }

                if (commands.length === 0) {
                    return interaction.reply({ 
                        content: `No commands available for your bot.`, 
                        ephemeral: true 
                    });
                }

                await interaction.reply({
                    components: Menus,
                    ephemeral: true
                });

            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An unexpected error occurred. Please try again later.', ephemeral: true });
        }
    }
};
