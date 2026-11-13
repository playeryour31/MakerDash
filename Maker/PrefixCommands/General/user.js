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
} = require("discord.js");
const moment = require('moment-timezone');
module.exports = {
    name: "user",
    type: "General",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            let member = message.mentions.members.first() || message.guild.members.cache.get(args[1]) || message.member

            let embed = new EmbedBuilder()

                .addFields({
                    name: `Username :`,
                    value: `${member.user.username}`,
                    inline: true,
                })

                .addFields({
                    name: `Tag :`,
                    value: `${member.user.discriminator}`,
                    inline: true,
                })

                .addFields({ name: `User id :`, value: `${member.id}`, inline: true })

                .addFields({
                    name: `Nickname :`,
                    value: message.guild.members.cache.find((e) => e.id == member.id)
                        .nickname
                        ? message.guild.members.cache.find((e) => e.id == member.id)
                            .nickname
                        : member.user.username,
                    inline: true,
                })

                .addFields({
                    name: `Bot :`,
                    value: member.bot ? "true" : "false",
                    inline: true,
                })

                .addFields({
                    name: `Joined Discord :`,
                    value: `${moment(member.user.createdAt)
                        .toString()
                        .substr(0, 15)} | ${moment(member.user.createdAt).fromNow()}`,
                    inline: true,
                })

                .addFields([
                    {
                        name: `Joined Server :`,
                        value: `${moment(member.joinedAt).toString().substr(0, 15)}`,
                        inline: true,
                    },
                ])

                .setColor(message.guild.members.me.displayColor)
                .setAuthor(
                    {
                        name: `${member.tag}`,
                        iconURL: member.displayAvatarURL({ dynamic: true })
                    }
                )
                .setThumbnail(member.displayAvatarURL({ dynamic: true }))

                .setFooter(
                    {
                        text: `Requested by ${message.author.tag}`,
                        iconURL: message.author.displayAvatarURL({ dynamic: true })
                    }
                );

            message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};