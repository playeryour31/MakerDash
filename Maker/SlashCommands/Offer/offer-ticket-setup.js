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

const { Database } = require("st.db");
const db = require("../../lib/featureDb")("offer");


module.exports = {
    data: new SlashCommandBuilder()
        .setName('offer-ticket-setup')
        .setDescription('Set up offer ticket settings.')
        .addChannelOption(option =>
            option.setName("ticket_category")
                .setDescription("Select category for the 1st button in panel.")
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true))
        .addStringOption(option =>
            option.setName("button_name")
                .setDescription("Type the name of the button.")
                .setRequired(true)
                .setMaxLength(40))
        .addRoleOption(option =>
            option.setName("support_role")
                .setDescription("Select the role for the Sellers team.")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("button_color")
                .setDescription("Pick the color of the button.")
                .addChoices(
                    { name: "Blue", value: "1" },
                    { name: "Gray", value: "2" },
                    { name: "Green", value: "3" },
                    { name: "Red", value: "4" },
                )
                .setRequired(true)),
    type: "Offer",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: true,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let panal_category = interaction.options.getChannel("ticket_category")
            let button_name = interaction.options.getString("button_name")
            let button_color = interaction.options.getString("button_color") || 2
            let support_role = interaction.options.getRole("support_role")

            db.set("OfferticketSetupData_" + client.user.id + "_" + interaction.guild.id, {
                panal_categoryID: panal_category.id,
                button_name: button_name,
                button_color: button_color,
                support_role: support_role.id,
            })



  await interaction.reply({
            content: reply.Offer.Reply1,
            ephemeral: false
        });

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};