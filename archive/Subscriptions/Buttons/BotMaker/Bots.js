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
    name: "continue",
    ownerOnly: false,
        /**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 */
    run: async (client, interaction, args, config) => {
        try {
            let type = interaction.customId.split("_")[0]?.trim()

            const modal = new ModalBuilder()
			.setCustomId(`${type}_modal-purches-bot`)
			.setTitle(`${type} bot`);
			const language = new TextInputBuilder()
                .setCustomId('language')
                .setLabel("Bot Language")
                .setPlaceholder("e.g., En")
                .setRequired(true)
                .setStyle(TextInputStyle.Short);
            const prefix = new TextInputBuilder()
			.setCustomId('prefix')
            .setRequired(true)
            .setMaxLength(3)
                .setPlaceholder("e.g., $")
			.setLabel("Bot's prefix")
			.setStyle(TextInputStyle.Short);
            const owner = new TextInputBuilder()
			.setCustomId('owner')
			.setLabel("Bot's owner")
                .setPlaceholder("e.g., 123456789012345678")
			.setStyle(TextInputStyle.Short);
            

            
            const the_lan = new ActionRowBuilder().addComponents(language);
            const the_prefix = new ActionRowBuilder().addComponents(prefix);
            const the_owner = new ActionRowBuilder().addComponents(owner);
            modal.addComponents(the_lan, the_prefix,the_owner);
            await interaction.showModal(modal);
        } catch (error) {
            console.log(error)
        }
    }
}