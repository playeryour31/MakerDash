const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { Database } = require('st.db');
const db = require("../../lib/featureDb")("temp_role");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("temprole-list")
        .setDescription("Displays a list of users with temporary roles.")
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('Filter by a specific role')
                .setRequired(false)
        ),

    type: "TempRole",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    support: false,
    ownerOnly: false,
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const roleFilter = interaction.options.getRole('role');
            const tempRoles = await db.get('TempRole') || [];
            const guildTempRoles = tempRoles.filter(entry => entry.Guild === interaction.guild.id);
            const filteredRoles = roleFilter ? guildTempRoles.filter(entry => entry.Role === roleFilter.id) : guildTempRoles;
            
 
            if (filteredRoles.length === 0) {
                return interaction.reply({ content: reply.TempRole.Reply13, ephemeral: true });
            }

            const itemsPerPage = 3;
            let pageIndex = 0;
            const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);

            const generateEmbed = (pageIndex) => {
                const start = pageIndex * itemsPerPage;
                const currentPageItems = filteredRoles.slice(start, start + itemsPerPage);
                const embed = new EmbedBuilder()
                    .setColor(interaction.guild.members.me.displayColor)
                    .setDescription(reply.TempRole.Reply14 + `(${pageIndex + 1}/${totalPages})`);

                currentPageItems.forEach(entry => {
const endTime = new Date(entry.EndTime);
embed.addFields({
    name: "\u200b",
    value: reply.TempRole.Reply15
        .replace("[User]", `${entry.User}`)
        .replace("[Role]", `${entry.Role}`)
        .replace("[Admin]", `${entry.Admin}`)
        .replace("[Reason]", entry.Reason)
        .replace("[Expires]", `<t:${Math.floor(endTime / 1000)}:R>`)
});
                });
                return embed;
            };


            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("prev_page")
                    .setLabel("◀")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIndex === 0), 
                new ButtonBuilder()
                    .setCustomId("next_page")
                    .setLabel("▶")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIndex === totalPages - 1)
            );

            const message = await interaction.reply({ embeds: [generateEmbed(pageIndex)], components: [row], ephemeral: false });

            const collector = message.createMessageComponentCollector({ time: 60000 });
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
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    },
};