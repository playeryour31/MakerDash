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
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("selfrole")

module.exports = {
    name: "set-panal-message",
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
            const role = interaction.customId.split("_")[1].trim()
            const type = interaction.customId.split("_")[2].trim()
            const name = interaction.customId.split("_")[3].trim()
            const color = interaction.customId.split("_")[4].trim()

            const modal = new ModalBuilder()
                .setCustomId(channel + "_" + role + "_" + type + "_" + "done" + "_" + color + "_" + name + "_selfrolepanal")
                .setTitle(reply.Selfrole.Setup.message.t);

            const message = new TextInputBuilder()
                .setCustomId('message')
                .setRequired(true)
                .setLabel(reply.Selfrole.Setup.message.input1)
                .setMaxLength(2000)
                .setStyle(TextInputStyle.Paragraph);

            const Msgtype = new TextInputBuilder()
                .setCustomId('type')
                .setLabel(reply.Selfrole.Setup.message.input1)
                .setPlaceholder("message / embed")
                .setRequired(false)
                .setMaxLength(45)
                .setStyle(TextInputStyle.Short);




            const the_message = new ActionRowBuilder().addComponents(message);
            const the_type = new ActionRowBuilder().addComponents(Msgtype);


            modal.addComponents(the_message, the_type);

            await interaction.showModal(modal);
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
