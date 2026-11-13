const {
    Client,
    Collection,
    Discord,
    createInvite,
    ChannelType,
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
    SlashCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
} = require("discord.js");


module.exports = {
    name: "copy",
    ownerOnly: false,
    run: async (client, interaction, args, config) => {
        try {
            const Embed = interaction.message.embeds[0];
             interaction.reply({ content: Embed.description.match(/```([^`]*)```/)[1], ephemeral: true });
        } catch (error) {
            console.log(error);
        }
    },
};