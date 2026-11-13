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
        .setName('kick')
        .setDescription('Kicks a member.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("The user to kick")
            .setRequired(true))
            .addStringOption(reason => reason
                .setName("reason")
                .setDescription("The reason of the kick"))
    ,
    type: "System",
    botP: [PermissionFlagsBits.KickMembers],
    userP: [PermissionFlagsBits.KickMembers],
    P: "KickMembers"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let user = interaction.options.getUser("user")
            let reason = interaction.options.getString("reason")
            let member = interaction.guild.members.cache.get(user.id)

            if (!member)
                return interaction
                    .reply({
                        content: reply.NotFound.Reply2,
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })


            if (member.id === interaction.member.id)
                return interaction
                    .reply({
                        content: reply.Others.Reply7.replace("[COMMAND]", "kick").replace("[AUTHOR]", interaction.user.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            if (
                interaction.member.roles.highest.position <= member.roles.highest.position
            )
                return interaction
                    .reply({
                        content: reply.Others.Reply7.replace("[COMMAND]", "kick").replace("[AUTHOR]", member.user.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            member.kick({reason: reason}).then(() => {
                return interaction
                    .reply({
                        content: reply.System.Kick2.replace("[USER]", member.user.username),
                        allowedMentions: { repliedUser: false }
                    })
            })

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};