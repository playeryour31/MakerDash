const { Client, Message, MessageActionRow, MessageButton, MessageEmbed, PermissionFlagsBits } = require('discord.js');
const { Database } = require('st.db');
const db = require("../../lib/featureDb")("temp_role");

module.exports = {
    name: "temprole-list",
    type: "TempRole",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    async run(client, message, args, language, reply, replyEmbeds, name) {
          try {
            const roleFilter = message.mentions.roles.first();
            const tempRoles = await db.get('TempRole') || [];
            const guildTempRoles = tempRoles.filter(entry => entry.Guild === message.guild.id);
            const filteredRoles = roleFilter ? guildTempRoles.filter(entry => entry.Role === roleFilter.id) : guildTempRoles;

            if (filteredRoles.length === 0) {
                return message.reply({ content: reply.TempRole.Reply13, ephemeral: true });
            }

            const itemsPerPage = 3;
            let pageIndex = 0;
            const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);

            const generateEmbed = (pageIndex) => {
                const start = pageIndex * itemsPerPage;
                const currentPageItems = filteredRoles.slice(start, start + itemsPerPage);
                const embed = new MessageEmbed()
                    .setColor(message.guild.members.me.displayColor)
                    .setDescription(reply.TempRole.Reply14 + `(${pageIndex + 1}/${totalPages})`);

                currentPageItems.forEach(entry => {
                    const endTime = new Date(entry.EndTime);
                    embed.addField("\u200b", reply.TempRole.Reply15
                        .replace("[User]", `${entry.User}`)
                        .replace("[Role]", `${entry.Role}`)
                        .replace("[Admin]", `${entry.Admin}`)
                        .replace("[Reason]", entry.Reason)
                        .replace("[Expires]", `<t:${Math.floor(endTime / 1000)}:R>`));
                });

                return embed;
            };

            const row = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId("prev_page")
                    .setLabel("◀")
                    .setStyle("SECONDARY")
                    .setDisabled(pageIndex === 0),
                new MessageButton()
                    .setCustomId("next_page")
                    .setLabel("▶")
                    .setStyle("SECONDARY")
                    .setDisabled(pageIndex === totalPages - 1)
            );

            const messageSent = await message.reply({ embeds: [generateEmbed(pageIndex)], components: [row] });

            const collector = messageSent.createMessageComponentCollector({ time: 60000 });
            collector.on("collect", async i => {
                if (i.customId === "prev_page" && pageIndex > 0) {
                    pageIndex--;
                }
                if (i.customId === "next_page" && pageIndex < totalPages - 1) {
                    pageIndex++;
                }
                await i.update({ embeds: [generateEmbed(pageIndex)], components: [row] });
            });

        } catch (error) {
            console.error(error);
            return message.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    },
};