const {
    Client,
    Collection,
    Discord,
    createInvite,
    ChannelType,
    WebhookClient,
    PermissionFlagsBits,
    GatewayIntentBits,
    Partials,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    Events,
    Message,
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
    PermissionOverwriteManager,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db");
const db = require("../../lib/featureDb")("giveaway");
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gmanage')
        .setDescription('Manage the giveaways setting.')
        .addStringOption(emoji => emoji
            .setName("emoji")
            .setDescription("Add the emoji for the giveaway.")
            .setRequired(true))
        .addStringOption(buttonColor => buttonColor
            .setName("button_color")
            .setDescription("Select the button color for the giveaway.")
            .setRequired(false)
            .addChoices(
                { name: "Red", value: "Danger" },
                { name: "Green", value: "Success" },
                { name: "Gray", value: "Secondary" },
                { name: "Blue", value: "Primary" }
            )),
    type: "Giveaway",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    support: false,
    ownerOnly: false,

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const emoji = interaction.options.getString("emoji");
            const buttonColor = interaction.options.getString("button_color");

            let buttonStyle = ButtonStyle.Primary; 
            if (buttonColor === "Danger") buttonStyle = ButtonStyle.Danger;
            else if (buttonColor === "Success") buttonStyle = ButtonStyle.Success;
            else if (buttonColor === "Secondary") buttonStyle = ButtonStyle.Secondary;

            if (emoji) db.set(`gemoji_${interaction.guild.id}_${client.user.id}`, emoji);
            if (buttonColor) db.set(`gbuttonColor_${interaction.guild.id}_${client.user.id}`, buttonColor);

            interaction.reply({
                content: reply.Giveaway.Reply18,
                ephemeral: true,
                allowedMentions: { repliedUser: false }
            });

        } catch (error) {
            console.log(error);
            return interaction.reply({
                embeds: [replyEmbeds.errorEmbed],
                ephemeral: true,
                allowedMentions: { repliedUser: false }
            });
        }
    },
};
