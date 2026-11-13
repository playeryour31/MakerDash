const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    name: "boost-list",
    type: "System",
    botP: [],
    userP: [],
    P: "Administrator",
    ownerOnly: false,

    async run(client, message, args, language, reply, replyEmbeds, name) {
        try {
            const premiumSubscribers = message.guild.members.cache.filter(member => member.premiumSince);
            const boosters = premiumSubscribers.map(member => {
                return `**#${member.user.tag}**\n-# **Boosted at: **<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`;
            });

            if (boosters.length === 0) {
                return message.reply({
                    content: reply.System.Boosts,
                    allowedMentions: { repliedUser: false }
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

            const msg = await message.reply({
                embeds: [generateEmbed(currentPage)],
                components: [buttons],
                allowedMentions: { repliedUser: false }
            });

            if (boosters.length <= itemsPerPage) return;

            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on("collect", async (btnInteraction) => {
                if (btnInteraction.user.id !== message.author.id) {
                    return btnInteraction.reply({ content: "❌ You cannot control this menu.", ephemeral: true });
                }

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
                await msg.edit({ components: [] }).catch(() => { });
            });
        } catch (error) {
            console.log(error);
            return message.reply({ embeds: [replyEmbeds.errorEmbed], allowedMentions: { repliedUser: false } });
        }
    },
};
