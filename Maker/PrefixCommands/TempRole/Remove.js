const { Client, Message, PermissionFlagsBits } = require("discord.js");
const { Database } = require("st.db");
const db = require("../../lib/featureDb")("temp_role");

module.exports = {
    name: "temprole-remove",
    description: "Remove a temporary role from a user.",
    type: "TempRole",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
     * @param {Client} client
     * @param {Message} message
     */
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
                 if (!args[0] || !args[1]) {
                return message.reply({ content: language === "Ar" ? "من فضلك حدد مستخدمًا ورابطة" : "Please specify both a user and a role." });
            }

            const user = message.mentions.users.first();
            const role = message.mentions.roles.first();

            if (!user) {
                return message.reply({ content: language === "Ar" ? "لم يتم العثور على المستخدم." : "User not found." });
            }
            if (!role) {
                return message.reply({ content: language === "Ar" ? "لم يتم العثور على الدور." : "Role not found." });
            }

            const member = message.guild.members.cache.get(user.id);
            if (!member) {
                return message.reply({
                    content: reply.TempRole.Reply9,
                    ephemeral: true
                });
            }

            if (!member.roles.cache.has(role.id)) {
                return message.reply({
                    content: reply.TempRole.Reply10 + `${role.name}.`,
                    ephemeral: true
                });
            }

            const tempRoles = await db.get('TempRole') || [];
            const tempRoleEntry = tempRoles.find(entry => entry.User === user.id && entry.Role === role.id && entry.Guild === message.guild.id);

            if (!tempRoleEntry) {
                return message.reply({
                    content: reply.TempRole.Reply11.replace("[Role]", role.name).replace("[User]", user.tag),
                    ephemeral: true
                });
            }

            await member.roles.remove(role).then(async () => {
                await db.set('TempRole', tempRoles.filter(entry => entry.User !== user.id || entry.Role !== role.id || entry.Guild !== message.guild.id));

                message.reply({
                    content: reply.TempRole.Reply12.replace("[Role]", role.name).replace("[User]", user.tag),
                    ephemeral: false
                });
            }).catch(err => {
                console.error(err);
                message.reply({ content: reply.Errors.Reply3, ephemeral: true });
            });

        } catch (error) {
            console.error(error);
            return message.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    },
};
