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
        .setName('timeout')
        .setDescription('Timeout a user from sending messages, react or join voice channels.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("The user to timeout.")
            .setRequired(true))
        .addStringOption(time => time
            .setName("time")
            .setDescription("Time duration for the timeout."))
        .addStringOption(reason => reason
            .setName("reason")
            .setDescription("The reason of timeout."))
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
            let time = interaction.options.getString("time") || '24h'
            let reason = interaction.options.getString("reason")

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

            if (time) {
                if (
                    (!time.endsWith("s") &&
                        !time.endsWith("m") &&
                        !time.endsWith("h") &&
                        !time.endsWith("d") &&
                        !time.endsWith("w")) &&
                    !time.endsWith("mo") &&
                    !time.endsWith("y")
                ) {
                    time = "24h"
                }
            }

            member
            .timeout(ms(time),reason)
            .then(() => {
                interaction.reply({
                    content: reply.System.TimeOut3.replace("[USER]", member.user.username),
                    allowedMentions: { repliedUser: false }
                });
            })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};