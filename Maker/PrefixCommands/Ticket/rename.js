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
    name: "rename",
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

            if (args.length < 1) {
                return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
            }
            let name = args.slice(0).join(" ");
            message.delete().catch()
            if (!name && message.channel.name == message.author.username) {
                message.channel.edit({
                    name: "ticket-" + ticketData.ID
                }).catch((err) => { })

            }
            else if (!name && message.channel.name != message.author.username) {

                message.channel.edit({
                    name: message.author.username
                }).catch((err) => { })

            }
            else if (name) {
                message.channel.edit({
                    name: name
                }).catch((err) => { })
            }
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};