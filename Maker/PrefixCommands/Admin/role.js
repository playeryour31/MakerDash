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
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
} = require("discord.js");
const ms = require("ms")

module.exports = {
    name: "role",
    type: "System",
    botP: [PermissionFlagsBits.ManageRoles],
    userP: [PermissionFlagsBits.ManageRoles],
    P: "ManageRoles",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            if (args.length < 1) {
                return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
            }
            const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || await message.guild.members.fetch(args[0]).catch(() => { });
            const rolesids = args.slice(1);

            let workingRoles = []
            const roles = rolesids.forEach(async r => {
                let rrs = message.guild.roles.cache.get(r)
                if (rrs) {
                    await workingRoles.push(rrs.id)
                }
            }) || message.mentions.roles
            const roleIDs = Array.from(roles.keys());
            if (roleIDs.length > 0) {
                roleIDs.forEach(r => {
                    workingRoles.push(r)
                })
            }
            if (!member)
                return message
                    .reply({
                        content: reply.NotFound.Reply2,
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            let rolesText = "";
            let msgreply = true
            for (const r of workingRoles) {
                let role = message.guild.roles.cache.get(r)
                if (!role.name) role.name = "Role"
                if (role.position >= message.member.roles.highest.position) {
                    if (workingRoles.length == 1) {
                        msgreply = false

                        let embed = new EmbedBuilder().setColor("Red").setDescription(reply.System.Role1.replace("[ROLE]", role.name))
                        return message.reply({ embeds: [embed], ephemeral: true, allowedMentions: { repliedUser: false } })
                    } else {
                        return rolesText += "!" + role.name
                    }
                }
                if (role.position >= message.guild.members.me.roles.highest.position) {
                    if (workingRoles.length == 1) {
                        msgreply = false

                        let embed = new EmbedBuilder().setColor("Red").setDescription(reply.System.Role2.replace("[ROLE]", role.name))
                        return message.reply({ embeds: [embed], ephemeral: true, allowedMentions: { repliedUser: false } })
                    } else {
                        return rolesText += "!" + role.name + " "
                    }
                }


                let roleName = role.name ?? "Role"
                if (!member.roles.cache.has(role.id)) {
                    member.roles.add(role.id).then((rr) => {
                        rolesText += "+" + roleName + " "
                        if (workingRoles.length == 1) {
                            msgreply = false
                            let embed = new EmbedBuilder().setColor("Green").setDescription(reply.System.Role3.replace("[ROLES]", rolesText).replace("[USER]", member.user.username))
                            return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
                        }
                        return
                    }).catch(() => {
                        rolesText += "!" + roleName + " "
                        if (workingRoles.length == 1) {
                            msgreply = false
                            let embed = new EmbedBuilder().setColor("Green").setDescription(reply.System.Role3.replace("[ROLES]", rolesText).replace("[USER]", member.user.username))
                            return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
                        }
                        return
                    })
                } else {
                    member.roles.remove(role.id).then(() => {
                        rolesText += "-" + roleName + " "
                        if (workingRoles.length == 1) {
                            msgreply = false
                            let embed = new EmbedBuilder().setColor("Green").setDescription(reply.System.Role3.replace("[ROLES]", rolesText).replace("[USER]", member.user.username))
                            return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
                        }
                        return
                    }).catch(() => {
                        rolesText += "!" + roleName + " "
                        if (workingRoles.length == 1) {
                            msgreply = false
                            let embed = new EmbedBuilder().setColor("Green").setDescription(reply.System.Role3.replace("[ROLES]", rolesText).replace("[USER]", member.user.username))
                            return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
                        }
                        return
                    })
                }
            }

            if (msgreply == true && workingRoles.length > 1) {
                setTimeout(async () => {
                    let embed = new EmbedBuilder().setColor("Green").setDescription(reply.System.Role3.replace("[ROLES]", rolesText).replace("[USER]", member.user.username))
                    return await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
                }, 1000 * workingRoles.length)
            }

        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};