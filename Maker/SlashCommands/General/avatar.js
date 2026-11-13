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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Display your\'s avatar or someone else\'s avatar.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("The user to get avatar for."))
    ,
    type: "General",
    botP: [],
    userP: [],
    P: ""
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const userOption = interaction.options.getUser("user");
            const member = userOption ? userOption : interaction.user;

            const avatar = member.displayAvatarURL({ size: 1024, dynamic: true });
            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Download")
                    .setURL(avatar)
            );

            const embed = new EmbedBuilder()
                .setAuthor({ name: member.username, iconURL: member.displayAvatarURL({ dynamic: true }) })
                .setTitle("Avatar Link")
                .setURL(avatar)
                .setImage(avatar)
                .setColor(interaction.guild.members.me.displayColor)
                .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

            interaction.reply({ embeds: [embed], components: [button] });

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};