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
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("ticket")
const db2 = require("../../lib/featureDb")("temp_ticket")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
		.setDescription('Closes the current ticket.')
    ,
    type: "Ticket",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {

            let ticketData = db2.get("ticketData_" + client.user.id + "_" + interaction.channel.id) || null
            if (!ticketData) return interaction.reply({ content: reply.Ticket.Reply41, ephemeral: true })
            if (!interaction.channel.name.startsWith(`ticket-`) && !ticketData) return
            const auther = await interaction.guild.members.fetch(interaction.user.id);
            const role1 = auther.roles.cache.some(role => role.id === ticketData.support_role);
            if (!role1) {
                const embed = new EmbedBuilder()
                    .setColor('Red')
                    .setDescription(reply.Ticket.Reply1)
                return interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { repliedUser: false } });
            }
			const TicketButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_hide`)
                    .setStyle(ButtonStyle.Danger)
                    .setLabel("Close")
                    .setDisabled(false),
                new ButtonBuilder()
                    .setCustomId(`close_cancel`)
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Cancel")
                    .setDisabled(false),
            );
  			return interaction.reply({
                content: reply.Ticket.Reply10,
                components: [TicketButtons],
            });
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};