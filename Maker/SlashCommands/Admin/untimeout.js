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
const ms = require("ms");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Timeout a user from sending messages, react or join voice channels.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("The user to timeout.")
            .setRequired(true))
    ,
    type: "System",
    botP: [PermissionFlagsBits.ModerateMembers],
    userP: [PermissionFlagsBits.ModerateMembers],
    P: "ModerateMembers"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let user = interaction.options.getUser("user")

            const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => { });
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
                        content: reply.Others.Reply7.replace("[COMMAND]", "timeout").replace("[AUTHOR]", interaction.user.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })


            if (
                interaction.member.roles.highest.position <= member.roles.highest.position
            )
                return interaction
                    .reply({
                        content: reply.Others.Reply7.replace("[COMMAND]", "timeout").replace("[AUTHOR]", member.user.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            member
                .timeout(
                    ms("1s"),
                    "done by:" + interaction.member.nickname, interaction.user.id)
                .then(() => {
                    interaction.reply({
                        content: reply.System.UnTimeOut2.replace("[USER]", member.user.username),
                    });
                })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};