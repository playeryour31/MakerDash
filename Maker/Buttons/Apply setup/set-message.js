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
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
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
    RoleSelectMenuBuilder,
} = require("discord.js");
const db = require("../../lib/applyDb")
module.exports = {
    name: "change-messagebtn",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const channel = interaction.customId.split("_")[0].trim()
            const requests = interaction.customId.split("_")[1].trim()
            const role = interaction.customId.split("_")[2].trim()

            const modal = new ModalBuilder()
                .setCustomId(channel + "_" + requests + "_" + role + "_" + "done" + "_application")
                .setTitle(reply.Apply.Asks.Message.t);

            const message = new TextInputBuilder()
                .setCustomId('message')
                .setRequired(true)
                .setLabel(reply.Apply.Asks.Message.message)
                .setMaxLength(2000)
                .setStyle(TextInputStyle.Paragraph);

            const type = new TextInputBuilder()
                .setCustomId('type')
                .setLabel(reply.Apply.Asks.Message.type)
                .setPlaceholder("message / embed")
                .setRequired(false)
                .setMaxLength(45)
                .setStyle(TextInputStyle.Short);




            const the_message = new ActionRowBuilder().addComponents(message);
            const the_type = new ActionRowBuilder().addComponents(type);


            modal.addComponents(the_message, the_type);

            await interaction.showModal(modal);
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
