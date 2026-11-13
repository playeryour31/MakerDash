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
    name: "request-reject",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const requester = interaction.customId.split("_")[0].trim();
            let claimer = db2.get(interaction.channel.id + "_claimed")

            if (claimer && interaction.user.id != claimer && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) 
            return interaction.reply({ content: reply.Ticket.Reply40, ephemeral: true })

            interaction.deferUpdate();

            const embed = new EmbedBuilder()
                .setColor("Red")
                .setDescription(interaction.message.embeds[0].description)

            const Requestbuttons = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId(requester + "_request-accept")
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Accept")
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(requester + "_request-reject")
                    .setStyle(ButtonStyle.Danger)
                    .setLabel("Reject")
                    .setDisabled(true)
            ]);
            interaction.message.edit({embeds: [embed], components: [Requestbuttons] })

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
