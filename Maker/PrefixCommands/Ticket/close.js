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
} = require("discord.js");
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("ticket")
const db2 = require("../../lib/featureDb")("temp_ticket")

module.exports = {
    name: "close",
    type: "Ticket",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
             let ticketData = db2.get("ticketData_" + client.user.id + "_" + message.channel.id) || null
            if (!ticketData) return
            if (!message.channel.name.startsWith(`ticket-`) && !ticketData) return
const auther = await message.guild.members.fetch(message.author.id);

            const role1 = auther.roles.cache.some(role => role.id === ticketData.support_role);

            if (!role1) {
                const embed = new EmbedBuilder()
                    .setColor('Red')
                    .setDescription(reply.Ticket.Reply1)
                return message.reply({ embeds: [embed], ephemeral: true, allowedMentions: { repliedUser: false } });
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
            return message.reply({
                content: reply.Ticket.Reply10,
                components: [TicketButtons],
            });
            
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};