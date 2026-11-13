const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban-list")
        .setDescription("Shows the list of banned users with reasons.")
    ,
    type: "System",
    botP: [PermissionFlagsBits.BanMembers],
    userP: [PermissionFlagsBits.BanMembers],
    P: "BanMembers",
    support: false,
    ownerOnly: false,

    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            await interaction.deferReply({ ephemeral: false });
            const bans = await interaction.guild.bans.fetch();
            if (bans.size === 0) {
                return interaction.editReply({ content: reply.System.BanList1 });
            }
let rr;
if (language === "Ar") {
	rr = "لا يوجد سبب";
} else { 
rr = "No reason provided";
}
            const bannedUsers = bans.map((ban, index) => {
                const reason = ban.reason || rr;
                return `**#${ban.user.tag}:\n-# (${ban.user.id})\n-# Reason: ${reason}**`;
            });

            const itemsPerPage = 10;
            let currentPage = 0;

            const generateEmbed = (page) => {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const pageItems = bannedUsers.slice(start, end).join("\n\n");

                return new EmbedBuilder()
                    .setColor(interaction.guild.members.me.displayColor)
                    .setTitle(reply.System.BanList + ` (${bans.size})`)
                    .setDescription(pageItems)
                    .setFooter({ text: `${page + 1}/${Math.ceil(bannedUsers.length / itemsPerPage)}` });
            };

            let components = [];
            if (bannedUsers.length > itemsPerPage) {
                components = [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("prev_page")
                            .setEmoji("⬅️")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId("next_page")
                            .setEmoji("➡️")
                            .setStyle(ButtonStyle.Secondary)
                    )
                ];
            }

            const message = await interaction.editReply({ embeds: [generateEmbed(currentPage)], components });

            if (bannedUsers.length <= itemsPerPage) return;

            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on("collect", async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "❌ You cannot control this menu.", ephemeral: true });
                }

                if (i.customId === "prev_page" && currentPage > 0) {
                    currentPage--;
                } else if (i.customId === "next_page" && currentPage < Math.ceil(bannedUsers.length / itemsPerPage) - 1) {
                    currentPage++;
                }

                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("prev_page")
                                .setEmoji("⬅️")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage === 0),
                            new ButtonBuilder()
                                .setCustomId("next_page")
                                .setEmoji("➡️")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage === Math.ceil(bannedUsers.length / itemsPerPage) - 1)
                        )
                    ]
                });
            });

            collector.on("end", () => {
                message.edit({ components: [] }).catch(() => {});
            });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [replyEmbeds.errorEmbed] });
        }
    }
};
