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
} = require("discord.js");
const ms = require("ms")

module.exports = {
    name: "untimeout",
    type: "System",
    botP: [PermissionFlagsBits.ModerateMembers],
    userP: [PermissionFlagsBits.ModerateMembers],
    P: "ModerateMembers",
    ownerOnly: false,
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            if (args.length < 1) {
                return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
            }
            const member = message.mentions.members.first() || message.guild.members.cache.get(args[0])  || await message.guild.members.fetch(args[0]).catch(() =>{});
            
            if (!member)
                return message
                    .reply({
                        content: reply.NotFound.Reply2,
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            if (member.id === message.member.id)
                return message
                    .reply({
                        content: reply.Others.Reply7.replace("[COMMAND]", "timeout").replace("[AUTHOR]", message.author.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            if (
                message.member.roles.highest.position <= member.roles.highest.position
            )
                return message
                    .reply({
                        content: reply.Others.Reply7.replace("[COMMAND]", "timeout").replace("[AUTHOR]", member.user.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

                    member
                    .timeout(
                      ms("1s"),
                      "done by:" + message.member.nickname , message.author.id)
                    .then(() => {
                      message.reply({
                        content: reply.System.UnTimeOut2.replace("[USER]", member.user.username),
                      });
                    })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};