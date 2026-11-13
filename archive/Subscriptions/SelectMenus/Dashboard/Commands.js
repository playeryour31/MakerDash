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
// Runtime gates read CommandStatus (platform ns command_status), not EnableChannels.
let commandStatusDb = new Database('/Database/Others/CommandStatus.json');
const config = require("../../../Main/Resources/Config.json");
const OwnerDB = new Database("/Database/Others/OwnerData");
module.exports = {
    name: "commands-selector",
    description: "",
    usage: [""],
    botPermission: [""],
    authorPermission: [""],
    cooldowns: [0],
    ownerOnly: false,

    run: async (client, interaction) => {
        try {
            const Selected = interaction.values[0];
            let command = Selected.split("_")[0]?.trim();
            let action = Selected.split("_")[1]?.trim();
            let id = Selected.split("_")[2]?.trim();
            const statusKey = `Status_${id}_${command}`;
            let currentStatus = commandStatusDb.get(statusKey);

            if (action === "enable") {
                if (currentStatus !== false) {
                    return interaction.reply({
                        content: `Command "${command}" is already enabled.`,
                        ephemeral: true
                    });
                }

                commandStatusDb.delete(statusKey);
                await interaction.reply({
                    content: `Command "${command}" has been enabled.`,
                    ephemeral: true
                });

            } else if (action === "disable") {
                if (currentStatus === false) {
                    return interaction.reply({
                        content: `Command "${command}" is already disabled.`,
                        ephemeral: true
                    });
                }

                commandStatusDb.set(statusKey, false);
                await interaction.reply({
                    content: `Command "${command}" has been disabled.`,
                    ephemeral: true
                });
            } else if (action === "channel") {
                const Modal = new ModalBuilder()
                    .setCustomId(`${id}_disabledchannels_${command}`)
                    .setTitle("Configure Bot Channels");

                const inputField = new TextInputBuilder()
                    .setCustomId("input")
                    .setLabel("Channel IDs to disable.")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(inputField);
                Modal.addComponents(row);

                await interaction.showModal(Modal);
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'An error occurred while processing your request. Please try again later.',
                ephemeral: true
            });
        }
    }
};