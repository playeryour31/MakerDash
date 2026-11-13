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
const db = require("../../lib/featureDb")("offer")

module.exports = {
    name: "ticketclose",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            let CountsDB = interaction.customId.split("_")[0].trim();
            const Ticketbuttons = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId(`${CountsDB}_offerhide`)
                    .setStyle(ButtonStyle.Danger)
                    .setLabel("Close")
                    .setDisabled(false),
                new ButtonBuilder()
                    .setCustomId(`close_cancel`)
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Cancel")
                    .setDisabled(false),
            ]);
            return interaction.reply({content: reply.Ticket.Reply10, components:[Ticketbuttons]})




        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
