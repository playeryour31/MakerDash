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

module.exports = {
    name: "buy",
    ownerOnly: false,
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction, args, config) => {
        try {
            const modal = new ModalBuilder()
                .setCustomId(`modal-purches-subscriptions`)
                .setTitle(`Subscriptions bot`);

            const prefix = new TextInputBuilder()
                .setCustomId('server')
                .setRequired(true)
                .setPlaceholder("Ex: 1258322732853231616")
                .setLabel("Bot's Server")
                .setStyle(TextInputStyle.Short);

            const owner = new TextInputBuilder()
                .setCustomId('owner')
                .setLabel("Bot's owners")
                .setPlaceholder("Ex: 1258322732853231616, 941085346886717480")
                .setStyle(TextInputStyle.Paragraph);

            const the_prefix = new ActionRowBuilder().addComponents(prefix);
            const the_owner = new ActionRowBuilder().addComponents(owner);

            modal.addComponents(the_prefix, the_owner);

            await interaction.showModal(modal);
        } catch (error) {
            console.log(error);
        }
    }
};