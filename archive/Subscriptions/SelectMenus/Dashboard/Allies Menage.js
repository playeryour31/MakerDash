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
let commandsdb = new Database('./Main/Resources/Commands.json');
let botbuildingdb = new Database('/Database/Others/Building.json');
const config = require("../../../Main/Resources/Config.json");
const OwnerDB = new Database("/Database/Others/OwnerData");
const moment = require('moment-timezone');
const Tokens = new Database("/Database/Others/Tokens.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");

module.exports = {
    name: "aliases-selector",
    description: "",
    usage: [""],
    botPermission: [""],
    authorPermission: [""],
    cooldowns: [0],
    ownerOnly: false,

    /**
     * Handles the interaction for alias selection.
     * @param {ChatInputCommandInteraction} interaction - The interaction object.
     */
    run: async (client, interaction) => {
        try {
            const bots = Tokens.get('Bots') || [];

            const Selected = interaction.values[0];
            let command = Selected.split("_")[0]?.trim()
            let action = Selected.split("_")[1]?.trim()
            let id = Selected.split("_")[2]?.trim()
const userBots = (bots || []).filter(bot => bot.ClientID === id);
const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
if (!isOwner) { 
    return interaction.reply({ 
        content: 'You do not have permission to manage this bot.', 
        ephemeral: true 
    });
}

            const modal = new ModalBuilder()
                .setCustomId(`modal-aliases_${command}_${id}_${action}`)
                .setTitle(`${action} ${command} aliases`);

            const aliaseInput = new TextInputBuilder()
                .setCustomId('aliase')
                .setRequired(true)
                .setLabel(`Type the alias to ${action}`)
                .setPlaceholder(`Command: ${command}`)
                .setStyle(TextInputStyle.Short);

            const aliasRow = new ActionRowBuilder().addComponents(aliaseInput);
            modal.addComponents(aliasRow);

            await interaction.showModal(modal);
        } catch (error) {
            console.error(error);
        }
    }
};
