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
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("ticket")
const db2 = require("../../lib/featureDb")("temp_ticket")

module.exports = {
    name: "claim",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const role = interaction.customId.split("_")[0].trim();
            const checkrole = interaction.member.roles.cache.some(r => r.id === role);
            if (!checkrole) return interaction.reply({ content: reply.Ticket.Reply19.replace("[ROLE]", "<@&" + role + ">"), ephemeral: true, })
            if (interaction.user.id == interaction.channel.topic && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: reply.Ticket.Reply20, ephemeral: true, })
            interaction.deferUpdate();

            const embed = new EmbedBuilder()
                .setColor(interaction.member.displayHexColor)
                .setDescription(reply.Ticket.Reply21.replace("[USER]", interaction.user))

            const Ticketbuttons = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId("ticket_close")
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Close")
                    .setDisabled(false),
                new ButtonBuilder()
                    .setCustomId(role + "_claimed")
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Unclaim")
                    .setDisabled(false),
                    new ButtonBuilder()
                    .setCustomId(role + "_request")
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Request")
                    .setDisabled(false),
            ]);
            interaction.message.edit({ components: [Ticketbuttons] }).then(() => {
                interaction.channel.permissionOverwrites.edit(interaction.member, { SendMessages: true, });
                interaction.channel.permissionOverwrites.edit(role, { SendMessages: false, })

                interaction.channel.send({ embeds: [embed] }).then(() => {
                    db2.set(interaction.channel.id + "_claimed", interaction.user.id)
                })
            })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
