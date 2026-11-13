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
    name: "unmute",
    type: "System",
    botP: [PermissionFlagsBits.Administrator],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
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
                        content: reply.Others.Reply7.replace("[COMMAND]", "unmute").replace("[AUTHOR]", message.author.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            if (
                message.member.roles.highest.position <= member.roles.highest.position
            )
                return message
                    .reply({
                        content: reply.Others.Reply7.replace("[COMMAND]", "unmute").replace("[AUTHOR]", member.user.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

                    let muteRole = message.guild.roles.cache.find(
                        (role) => role.name == "Muted"
                      );
                      if (!member.roles.cache.some((role) => role.name == "Muted")) {
                        message
                          .reply({ content: reply.System.UnMute2.replace("[USER]", member.user.username) , allowedMentions: { repliedUser: false }})
                  
                      } else {
                        member.roles.remove(muteRole);
                        message
                          .reply({
                            content: reply.System.UnMute3.replace("[USER]", member.user.username),
                            allowedMentions: { repliedUser: false }
                          })
                  
                        }  
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};