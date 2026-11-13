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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Create new ticket panal.')
        .addChannelOption(channel => channel
            .setName("channel")
            .setDescription("Select the channel for panal.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addChannelOption(channel => channel
            .setName("ticket_category")
            .setDescription("Select category for the 1st button in panal.")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true))
        .addStringOption(name => name
            .setName("button_name")
            .setDescription("Type the name of the button.")
            .setRequired(true)
            .setMaxLength(40))
        .addRoleOption(role => role
            .setName("support_role")
            .setDescription("Select the role for the support team.")
            .setRequired(true))
        .addStringOption(color => color
            .setName("button_color")
            .setDescription("Pick the color of the button.")
            .addChoices(
                {name: "Blue", value: "1"},
                {name: "Gray", value: "2"},
                {name: "Green", value: "3"},
                {name: "Red", value: "4"},
            ))
        .addStringOption(emoji => emoji
            .setName("button_emoji")
            .setDescription("Type emoji for the button."))
    ,
    type: "Ticket",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let panal_channel = interaction.options.getChannel("channel")
            let panal_category = interaction.options.getChannel("ticket_category")
            let button_name = interaction.options.getString("button_name")
            let button_color = interaction.options.getString("button_color") || 1
            let button_emoji = interaction.options.getString("button_emoji") || null
            let support_role = interaction.options.getRole("support_role")

            let msg = await interaction.channel.send({ content: reply.Others.Reply19, allowedMentions: { repliedUser: false } })

            const modal = new ModalBuilder()
                .setCustomId(msg.id + "_ticketsetup")
                .setTitle(reply.Ticket.Modals.setup.t);

            const input1 = new TextInputBuilder()
                .setCustomId('panal_message')
                .setRequired(true)
                .setLabel(reply.Ticket.Modals.setup.inp1)
                .setMaxLength(2000)
                .setStyle(TextInputStyle.Paragraph);
                const input2 = new TextInputBuilder()
                .setCustomId('panal_message_type')
                .setRequired(true)
                .setLabel(reply.Ticket.Modals.setup.inp2)
                .setPlaceholder("message / embed")
                .setStyle(TextInputStyle.Short);
                const input3 = new TextInputBuilder()
                .setCustomId('panal_welcome')
                .setRequired(true)
                .setLabel(reply.Ticket.Modals.setup.inp3)
                .setMaxLength(2000)
                .setStyle(TextInputStyle.Paragraph);
                const input4 = new TextInputBuilder()
                .setCustomId('panal_welcome_type')
                .setRequired(true)
                .setLabel(reply.Ticket.Modals.setup.inp4)
                .setPlaceholder("message / embed")
                .setStyle(TextInputStyle.Short);
            
            const the_input1 = new ActionRowBuilder().addComponents(input1);
            const the_input2 = new ActionRowBuilder().addComponents(input2);
            const the_input3 = new ActionRowBuilder().addComponents(input3);
            const the_input4 = new ActionRowBuilder().addComponents(input4);

            modal.addComponents(the_input1, the_input2, the_input3, the_input4);

            db.set("ticketSetupData_" + msg.id,{
                panal_channelID: panal_channel.id,
                panal_categoryID: panal_category.id,
                button_name: button_name,
                button_color: button_color,
                button_emoji: button_emoji,
                support_role: support_role.id,
            }).then(() =>{
                interaction.showModal(modal);
            }).catch((error) =>{
                console.log(error)
                return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
            })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};