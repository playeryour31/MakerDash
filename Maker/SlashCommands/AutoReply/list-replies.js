const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { Database } = require("st.db");
const replydb = require("../../lib/featureDb")("sys_reply");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("list-replies")
        .setDescription("Show all stored automatic replies."),

    type: "AutoReply",
    botP: [PermissionFlagsBits.ManageGuild],
    userP: [PermissionFlagsBits.ManageGuild],
    P: "ManageGuild",
    support: false,
    ownerOnly: false,

    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const guild = interaction.guild;
            const user = interaction.user;
            const bot = client.user;


            const key = `Replies_${guild.id}_${bot.id}`;
            const replies = replydb.get(key) || [];

            if (replies.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle(reply.System.Reply9)
                    .setDescription(reply.System.Reply10);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            const replaceVariables = (text) => {
                return text
                    .replaceAll("{user}", `<@!${user.id}>`)
                    .replaceAll("{user.username}", user.username)
                    .replaceAll("{user.id}", user.id)
                    .replaceAll("{user.avatarURL}", user.displayAvatarURL({ dynamic: true }))

                    .replaceAll("{client.user.name}", bot.username)
                    .replaceAll("{client.user.id}", bot.id)
                    .replaceAll("{client.user.avatarURL}", bot.displayAvatarURL({ dynamic: true }))

                    .replaceAll("{server.name}", guild.name)
                    .replaceAll("{server.id}", guild.id)
                    .replaceAll("{server.iconURL}", guild.iconURL({ dynamic: true }))

                    .replaceAll("[User]", `<@!${user.id}>`)
                    .replaceAll("[UserUsername]", user.username)
                    .replaceAll("[UserID]", user.id)
                    .replaceAll("[UserAvatar]", user.displayAvatarURL({ dynamic: true }))

                    .replaceAll("[BotName]", bot.username)
                    .replaceAll("[BotID]", bot.id)
                    .replaceAll("[BotAvatar]", bot.displayAvatarURL({ dynamic: true }))

                    .replaceAll("[ServerName]", guild.name)
                    .replaceAll("[ServerID]", guild.id)
                    .replaceAll("[ServerIcon]", guild.iconURL({ dynamic: true }));
            };
            const embed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayColor)
                .setTitle(reply.System.Reply9)
                .setDescription(
                    replies.map(r => `- **${r.word}**\n-# ${r.responses.length > 0 ? replaceVariables(r.responses[0]) : reply.System.Reply12}`).join("\n\n")
                );
            await interaction.reply({ embeds: [embed], ephemeral: false });
     } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [replyEmbeds.errorEmbed] });
        }
    }
};