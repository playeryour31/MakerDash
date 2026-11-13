const {
    Client,
    Collection,
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

module.exports = {
    name: "err",
    ownerOnly: false,
    run: async (client, interaction, args, config) => {
        try {
            const errorModal = new ModalBuilder()
                .setCustomId('err_modal-bot')
                .setTitle('Error Reporting');
            const errorIdInput = new TextInputBuilder()
                .setCustomId('errid')
                .setRequired(true)
                .setLabel('Error ID')
                .setPlaceholder('Example: 1')
                .setStyle(TextInputStyle.Short);
            const actionRow = new ActionRowBuilder().addComponents(errorIdInput);
            errorModal.addComponents(actionRow);
            await interaction.showModal(errorModal);

        } catch (error) {
            console.error("An error occurred while showing the modal:", error);
            interaction.reply({ content: 'An error occurred while processing. Please try again later.', ephemeral: true });
        }
    }
};
