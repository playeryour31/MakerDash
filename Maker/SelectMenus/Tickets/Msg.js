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
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db");
const db = require("../../lib/featureDb")("ticket")

module.exports = {
    name: "select-content",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const MessageType = interaction.values[0];
            const panal_channel = interaction.customId.split("_")[1].trim()
            const panal_category = interaction.customId.split("_")[2].trim()
            const button_name = interaction.customId.split("_")[3].trim()
            const button_color = interaction.customId.split("_")[4].trim()
            const support_role = interaction.customId.split("_")[5].trim()
            const msg = interaction.customId.split("_")[6].trim()
            const Type = interaction.customId.split("_")[7].trim()
const modal = new ModalBuilder()
                .setCustomId("ticketsetup_" + msg + "_" + MessageType)
                .setTitle(reply.Ticket.Modals.setup.t);
            const input1 = new TextInputBuilder()
                .setCustomId('panal_message')
                .setRequired(true)
                .setLabel(reply.Ticket.Modals.setup.inp1)
                .setMaxLength(2000)
                .setStyle(TextInputStyle.Paragraph);
                const input3 = new TextInputBuilder()
                .setCustomId('panal_welcome')
                .setRequired(true)
                .setLabel(reply.Ticket.Modals.setup.inp3)
                .setMaxLength(2000)
                .setStyle(TextInputStyle.Paragraph);
            
            
            const the_input1 = new ActionRowBuilder().addComponents(input1);
            const the_input3 = new ActionRowBuilder().addComponents(input3);

            modal.addComponents(the_input1, the_input3);

            await db.set(`ticketSetupData_${msg}`, {
                type: Type,
                panal_channelID: panal_channel,
                panal_categoryID: panal_category,
                button_name: button_name,
                button_color: button_color || "1",
                support_role: support_role
            });
            await interaction.showModal(modal);
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
}
