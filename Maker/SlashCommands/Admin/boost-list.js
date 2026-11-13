const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boost-list')
        .setDescription('Shows a list of all members who boosted the server.'),
    type: "System",
    botP: [],
    userP: [],
    P: "Administrator",
    support: false,
    ownerOnly: false,
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const premiumSubscribers = interaction.guild.members.cache.filter(member => member.premiumSince);
            const boosters = premiumSubscribers.map(member => {
                return `**#${member.user.tag}**\n-# **Boosted at: **<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`;
            });

            if (boosters.length === 0) {
                return interaction.reply({
                    content: reply.System.Boosts,
                    ephemeral: true
                });
            }

            let currentPage = 0;
            const itemsPerPage = 7;
            const totalPages = Math.ceil(boosters.length / itemsPerPage);

            function generateEmbed(page) {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const pageBoosters = boosters.slice(start, end);

                return new EmbedBuilder()
                    .setTitle(`${page + 1}/${totalPages}`)
                    .setDescription(pageBoosters.join("\n"))
                    .setColor("Purple")
                    .setFooter({ text: `Total Boosters: ${boosters.length} || ${boosters.length * 2} Boost` });
            }

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("prev_boost_page")
                        .setEmoji("⬅️")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId("next_boost_page")
                        .setEmoji("➡️")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === totalPages - 1)
                );

            const message = await interaction.reply({
                embeds: [generateEmbed(currentPage)],
                components: [buttons],
                fetchReply: true
            });

            const filter = (btnInteraction) => {
                return btnInteraction.user.id === interaction.user.id;
            };

            const collector = message.createMessageComponentCollector({
                filter,
                time: 60000
            });

            collector.on("collect", async (btnInteraction) => {
                if (btnInteraction.customId === "prev_boost_page" && currentPage > 0) {
                    currentPage--;
                } else if (btnInteraction.customId === "next_boost_page" && currentPage < totalPages - 1) {
                    currentPage++;
                }

                await btnInteraction.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId("prev_boost_page")
                                    .setEmoji("⬅️")
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(currentPage === 0),
                                new ButtonBuilder()
                                    .setCustomId("next_boost_page")
                                    .setEmoji("➡️")
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(currentPage === totalPages - 1)
                            )
                    ]
                });
            });

            collector.on("end", async () => {
                await message.edit({ components: [] }).catch(() => { });
            });
        } catch (error) {
            console.log(error);
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true });
        }
    },
};
