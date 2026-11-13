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
const db = require("../../lib/applyDb")
module.exports = {
    data: new SlashCommandBuilder()
        .setName('new-application')
        .setDescription('Make new apply application system.')
        .addChannelOption(channel => channel
            .setName("application_channel")
            .setDescription("Pick application channel.")
            .setRequired(true))
        .addChannelOption(channel => channel
            .setName("requests_channel")
            .setDescription("Pick requests channel.")
            .setRequired(true))
        .addRoleOption(role => role
            .setName("role")
            .setDescription("The role for the apply application.")
            .setRequired(true))
            .addStringOption(message => message
                .setName("message")
                .setDescription("Want to add a message to the application?")
                .addChoices(
                    {name: "True", value: "true"},
                    {name: "False", value: "false"}
                )
                .setRequired(true))
    ,
    type: "Apply",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let role = interaction.options.getRole("role")
            let app_channel = interaction.options.getChannel("application_channel")
            let req_channel = interaction.options.getChannel("requests_channel")
            let message = interaction.options.getString("message")

            const modal = new ModalBuilder()
                .setCustomId(app_channel.id + "_" + req_channel.id + "_" + role.id + "_" + message + "_application")
                .setTitle(reply.Apply.Asks.t);

            const ask1 = new TextInputBuilder()
                .setCustomId('ask1')
                .setRequired(true)
                .setLabel(reply.Apply.Asks.q1)
                .setMaxLength(45)
                .setStyle(TextInputStyle.Short);


            const ask2 = new TextInputBuilder()
                .setCustomId('ask2')
                .setLabel(reply.Apply.Asks.q2)
                .setRequired(false)
                .setMaxLength(45)

                .setStyle(TextInputStyle.Short);

            const ask3 = new TextInputBuilder()
                .setCustomId('ask3')
                .setLabel(reply.Apply.Asks.q3)
                .setRequired(false)
                .setMaxLength(45)

                .setStyle(TextInputStyle.Short);

            const ask4 = new TextInputBuilder()
                .setCustomId('ask4')
                .setLabel(reply.Apply.Asks.q4)
                .setRequired(false)
                .setMaxLength(45)

                .setStyle(TextInputStyle.Short);

            const ask5 = new TextInputBuilder()
                .setCustomId('ask5')
                .setLabel(reply.Apply.Asks.q5)
                .setRequired(false)
                .setMaxLength(45)

                .setStyle(TextInputStyle.Short);



            const the_ask1 = new ActionRowBuilder().addComponents(ask1);
            const the_ask2 = new ActionRowBuilder().addComponents(ask2);
            const the_ask3 = new ActionRowBuilder().addComponents(ask3);
            const the_ask4 = new ActionRowBuilder().addComponents(ask4);
            const the_ask5 = new ActionRowBuilder().addComponents(ask5);


            modal.addComponents(the_ask1, the_ask2, the_ask3, the_ask4, the_ask5);

            await interaction.showModal(modal);
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};