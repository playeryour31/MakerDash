const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Database } = require("st.db");
const Tokens = new Database("./Database/Others/Tokens.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("user")
        .setDescription("View the bots owned by a specific user.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("bots")
                .setDescription("Display information about a specific user.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user whose bots you want to view.")
                .setRequired(true)
        )),
    ownerOnly: true,

    async run(client, interaction) {
        const targetUser = interaction.options.getUser("user") || interaction.user;
        const bots = Tokens.get("Bots") || [];
        const userBots = bots.filter(bot => bot.Owner === targetUser.id && bot.Seller === interaction.guild.id);

        if (userBots.length === 0) {
            return interaction.reply({ content: `${targetUser.username} does not own any bots.`, ephemeral: true });
        }

        let botDetails = await Promise.all(userBots.map(async bot => {
            const endTime = new Date(bot.endTime);
            const timeLeft = endTime - new Date();
            const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            const Client = await client.users.fetch(bot.ClientID).catch(() => null);
            const botName = Client ? Client.username : `${bot.Type} #${bot.BotID}`;

            return `**${botName}**\n> -# **Type:** ${bot.Type}\n> -# **ID:** #${bot.PurchasesID}-${bot.BotID}\n> -# **Expires In:** ${daysLeft} days, ${hoursLeft} hours\n`;
        }));

        const embed = new EmbedBuilder()
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setDescription(`## ${targetUser.username}'s Bots\n` + botDetails.join("\n") + `\n-# You have a ${userBots.length}`)
            .setColor(interaction.guild.members.me.displayColor);

        return interaction.reply({ embeds: [embed], ephemeral: false });
    }
};
