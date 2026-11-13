const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "nickname",
    type: "System",
    botP: [PermissionFlagsBits.ManageNicknames],
    userP: [PermissionFlagsBits.ManageNicknames],
    P: "ManageNicknames",
    ownerOnly: false,

    async run(client, message, args, language, reply, replyEmbeds, name) {
        try {
            const targetUser = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            const newNickname = args.slice(1).join(" ") || null;

            if (!targetUser) {
                return message.reply({ embeds: [replyEmbeds.errorEmbed], allowedMentions: { repliedUser: false } });
            }

            if (
                message.member.roles.highest.position <= targetUser.roles.highest.position &&
                message.guild.ownerId !== message.author.id
            ) {
                return message.reply({
                    content: reply.System.SetNick1.replace("USER", targetUser.user.tag),
                    allowedMentions: { repliedUser: false }
                });
            }

            await targetUser.setNickname(newNickname);
            
            if (!newNickname) {
                return message.reply({
                    content: reply.System.SetNick2.replace("USER", targetUser.user.tag),
                    allowedMentions: { repliedUser: false }
                });
            } else {
                return message.reply({
                    content: reply.System.SetNick3.replace("USER", targetUser.user.tag).replace("NICK", newNickname),
                    allowedMentions: { repliedUser: false }
                });
            }
        } catch (error) {
            console.error(error);
            return message.reply({ embeds: [replyEmbeds.errorEmbed], allowedMentions: { repliedUser: false } });
        }
    },
};
