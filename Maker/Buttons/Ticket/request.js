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
    name: "request",
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

            let claimer = db2.get(interaction.channel.id + "_claimed")

            if (claimer && interaction.user.id == claimer ||
                 interaction.channel.topic && interaction.channel.topic == interaction.user.id) 
            return interaction.reply({ content: reply.Ticket.Reply38, ephemeral: true })

            interaction.deferUpdate();

            const embed = new EmbedBuilder()
                .setColor("DarkButNotBlack")
                .setDescription(reply.Ticket.Reply39.replace("[USER]", interaction.user))

            const Requestbuttons = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId(interaction.user.id + "_request-accept")
                    .setStyle(ButtonStyle.Success)
                    .setLabel("Accept")
                    .setDisabled(false),
                new ButtonBuilder()
                    .setCustomId(interaction.user.id + "_request-reject")
                    .setStyle(ButtonStyle.Danger)
                    .setLabel("Reject")
                    .setDisabled(false),
            ]);
            interaction.channel.send({ embeds: [embed]  , components: [Requestbuttons] })

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
