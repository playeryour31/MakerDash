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
    Message,
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
    name: "clear",
    type: "System",
    botP: [PermissionFlagsBits.ManageMessages],
    userP: [PermissionFlagsBits.ManageMessages],
    P: "ManageMessages",
    ownerOnly: false,
    /**
 * @param {Message} message
 */
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            let number = args[0];
            if (isNaN(parseInt(args[0])) && parseInt(args[1]) != NaN) number = args[1]
            if (!args[0] || args[0] && args[1] == NaN) number = 100
            const member = message.mentions?.members.first() || message.guild.members.cache.get(args[0]) || await client.users.fetch(args[0]).catch(e => { });
            let delmsg = await message.reply({ content: reply.System.Clear3, allowedMentions: { repliedUser: false } })
            message.delete().catch()
            if (number > 1000) number == 1000
            let i = 0
            let msgToDel1 = []
            let msgToDel2 = []
            let msgToDel3 = []
            let msgToDel4 = []
            let msgToDel5 = []
            let msgToDel6 = []
            let msgToDel7 = []
            let msgToDel8 = []
            let msgToDel9 = []
            let msgToDel10 = []
            let messages = await message.channel.messages.fetch();
            if (member?.user) {
                messages = messages.filter((m) => {
                    if (m.author.id === member.user.id && i < number && m.id != delmsg.id) {
                        if (msgToDel1.length != 100) {
                            msgToDel1.push(m)
                        }
                        else if (msgToDel2.length != 100) {
                            msgToDel2.push(m)
                        }
                        else if (msgToDel3.length != 100) {
                            msgToDel3.push(m)
                        }
                        else if (msgToDel4.length != 100) {
                            msgToDel4.push(m)
                        }
                        else if (msgToDel5.length != 100) {
                            msgToDel5.push(m)
                        }
                        else if (msgToDel6.length != 100) {
                            msgToDel6.push(m)
                        }
                        else if (msgToDel7.length != 100) {
                            msgToDel7.push(m)
                        }
                        else if (msgToDel8.length != 100) {
                            msgToDel8.push(m)
                        }
                        else if (msgToDel9.length != 100) {
                            msgToDel9.push(m)
                        }
                        else if (msgToDel10.length != 100) {
                            msgToDel10.push(m)
                        }
                        i++
                    }
                });
            } else if (args[0] && args[0].toLowerCase() == "bots") {
                messages = messages.filter((m) => {
                    if (m.author.bot && i < number && m.id != delmsg.id) {
                        if (msgToDel1.length != 100) {
                            msgToDel1.push(m)
                        }
                        else if (msgToDel2.length != 100) {
                            msgToDel2.push(m)
                        }
                        else if (msgToDel3.length != 100) {
                            msgToDel3.push(m)
                        }
                        else if (msgToDel4.length != 100) {
                            msgToDel4.push(m)
                        }
                        else if (msgToDel5.length != 100) {
                            msgToDel5.push(m)
                        }
                        else if (msgToDel6.length != 100) {
                            msgToDel6.push(m)
                        }
                        else if (msgToDel7.length != 100) {
                            msgToDel7.push(m)
                        }
                        else if (msgToDel8.length != 100) {
                            msgToDel8.push(m)
                        }
                        else if (msgToDel9.length != 100) {
                            msgToDel9.push(m)
                        }
                        else if (msgToDel10.length != 100) {
                            msgToDel10.push(m)
                        }
                        i++
                    }
                });
            } else {
                messages = messages.filter((m) => {
                    if (i < number && m.id != delmsg.id) {
                        if (msgToDel1.length != 100) {
                            msgToDel1.push(m)
                        }
                        else if (msgToDel2.length != 100) {
                            msgToDel2.push(m)
                        }
                        else if (msgToDel3.length != 100) {
                            msgToDel3.push(m)
                        }
                        else if (msgToDel4.length != 100) {
                            msgToDel4.push(m)
                        }
                        else if (msgToDel5.length != 100) {
                            msgToDel5.push(m)
                        }
                        else if (msgToDel6.length != 100) {
                            msgToDel6.push(m)
                        }
                        else if (msgToDel7.length != 100) {
                            msgToDel7.push(m)
                        }
                        else if (msgToDel8.length != 100) {
                            msgToDel8.push(m)
                        }
                        else if (msgToDel9.length != 100) {
                            msgToDel9.push(m)
                        }
                        else if (msgToDel10.length != 100) {
                            msgToDel10.push(m)
                        }
                        i++
                    }
                });


            }
            message.channel.bulkDelete(msgToDel1, true);
            if (msgToDel2.length) {
                message.channel.bulkDelete(msgToDel2, true);
            }
            if (msgToDel3.length) {
                message.channel.bulkDelete(msgToDel3, true);
            }
            if (msgToDel4.length) {
                message.channel.bulkDelete(msgToDel4, true);
            }
            if (msgToDel5.length) {
                message.channel.bulkDelete(msgToDel5, true);
            }
            if (msgToDel6.length) {
                message.channel.bulkDelete(msgToDel6, true);
            }
            if (msgToDel7.length) {
                message.channel.bulkDelete(msgToDel7, true);
            }
            if (msgToDel8.length) {
                message.channel.bulkDelete(msgToDel8, true);
            }
            if (msgToDel9.length) {
                message.channel.bulkDelete(msgToDel9, true);
            }
            if (msgToDel10.length) {
                message.channel.bulkDelete(msgToDel10, true);
            }
            delmsg.edit({ content: reply.System.Clear4.replace("[NUMBER]", i), allowedMentions: { repliedUser: false } }).then(() => {
                setTimeout(() => {
                    if (delmsg) {
                        delmsg?.delete().catch()
                    }
                }, 3000)
            })

        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};