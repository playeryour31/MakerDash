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
        .setName('rename')
        .setDescription('Rename the ticket channel.')
        .addStringOption(name => name
            .setName("name")
            .setDescription("Type the new name.")
            .setRequired(true))
    ,
    type: "Ticket",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: true,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let name = interaction.options.getString("name")

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

            if (!name && interaction.channel.name == interaction.user.username) {
                interaction.channel.edit({
                    name: "ticket-" + ticketData.ID
                }).catch((err) => { })

            }
            else if (!name && interaction.channel.name != interaction.user.username) {

                interaction.channel.edit({
                    name: interaction.user.username
                }).catch((err) => { })

            }
            else if (name) {
                interaction.channel.edit({
                    name: name
                }).catch((err) => { })
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};