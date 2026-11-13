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
const db = require("../../lib/featureDb")("selfrole")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('selfrole-setup')
        .setDescription('Create new Selfrole panal.')
        .addChannelOption(channel => channel
            .setName("channel")
            .setDescription("Pick selfrole channel.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addRoleOption(role => role
            .setName("role")
            .setDescription("The role for the selfrole system.")
            .setRequired(true))
            .addStringOption(type => type
                .setName("type")
                .setDescription("Pick the type of the system.")
                .addChoices(
                    {name: "Button", value: "button"},
                    {name: "SelectMenu", value: "selectmenu"}
                )
                .setRequired(true))
            .addStringOption(message => message
                .setName("message")
                .setDescription("Want to add a message to the panal?")
                .addChoices(
                    {name: "True", value: "true"},
                    {name: "False", value: "false"}
                )
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
    ,
    type: "Selfrole",
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
            let channel = interaction.options.getChannel("channel")
            let role = interaction.options.getRole("role")
            let type = interaction.options.getString("type")
            let color = interaction.options.getString("button_color")
            let message = interaction.options.getString("message")

            let CustomId;
            if(type == "button"){
                CustomId = channel.id + "_" + role.id + "_" + type + "_" + message + "_" + color + "_selfrolepanal"
            }else{
                CustomId = channel.id + "_" + role.id + "_" + type + "_" + message + "_selfrolepanal"
            }
            const modal = new ModalBuilder()
                .setCustomId(CustomId)
                .setTitle(reply.Selfrole.Setup.modal.t);

            const input1 = new TextInputBuilder()
                .setCustomId('name')
                .setRequired(true)
                .setLabel(reply.Selfrole.Setup.modal.input1)
                .setPlaceholder(reply.Selfrole.Setup.modal.place1)
                .setMaxLength(20)
                .setStyle(TextInputStyle.Short);

            const the_input1 = new ActionRowBuilder().addComponents(input1);



            modal.addComponents(the_input1);

            await interaction.showModal(modal);
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};