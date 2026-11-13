const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Database } = require("st.db");
const LogsDate = new Database("./Subscriptions/Database/Others/Logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("top")
        .setDescription("View the list of buyers who purchased the bots or items this week.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("week")
                .setDescription("Display the top coins buyers this week.")
        ),
    ownerOnly: true,

    async run(client, interaction) {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
        startOfWeek.setHours(0, 0, 0, 0);

        const logs = LogsDate.get(`Logs_${client.user.id}_${interaction.guild.id}`) || [];

        const weeklyPurchases = logs.filter(log => {
            const logDate = new Date(log.Time);
            return logDate >= startOfWeek && log.Action === "Buy Coins";
        });

        const userPurchases = {};
        weeklyPurchases.forEach(log => {
            if (!userPurchases[log.User]) {
                userPurchases[log.User] = 0;
            }
            userPurchases[log.User] += log.Amount;
        });

        const sortedPurchases = Object.entries(userPurchases)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const description = sortedPurchases.map(([userId, amount], index) => {
            return `${index + 1}. <@${userId}> - ${amount} Coins`;
        }).join("\n");

        const embed = new EmbedBuilder()
            .setColor(interaction.guild.members.me.displayColor)
            .setTitle("Top 10 Coin Buyers This Week")
            .setDescription(description || "No purchases this week.")
            .setFooter({ text: `Week starting from ${startOfWeek.toDateString()}` });

        return interaction.reply({ embeds: [embed], ephemeral: false });
    }
};