const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder } = require("discord.js");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const botPrices = new Database("/Database/BotMaker/Prices.json");
const Tokens = new Database("/Database/Others/Tokens.json");
const UnusedTokens = new Database("/Database/Others/UnusedTokens.json");
const WorkingTokens = new Database("/Database/Tokens/WorkingTokens.json");
const NonWorkingTokens = new Database("/Database/Tokens/NonWorkingTokens.json");
const axios = require('axios');
const botsData = require("../../Resources/Bots.json");
const Colors = require("../../Resources/Colors.json");

module.exports = {
    name: "select-bots-user",
    description: "",
    usage: [""],
    botPermission: [""],
    authorPermission: [""],
    cooldowns: [0],
    ownerOnly: true,

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction) => {
        const id = interaction.values[0];
        const bots = Tokens.get('Bots') || [];
        const userBots = bots.filter(bot => bot.ClientID === id);

        try {
            if (userBots.length === 0) {
                return interaction.reply({
                    content: "No bot found with that ClientID.",
                    ephemeral: true
                });
            }

            const bot = userBots[0];
            const Client = await client.users.fetch(bot.ClientID).catch(() => ({ username: `${bot.Type} #${bot.BotID}` }));
			const s = bot.startTime;
			const e = bot.endTime;

            const botEmbed = new EmbedBuilder()
                .setColor(Colors.Main)
                .setTitle(`Bot Information: ${Client.username} #${bot.BotID}`)
                .addFields(
                    { name: "Bot Type", value: bot.Type, inline: false },
                    { name: "Bot ID", value: `${bot.BotID}`, inline: false },
                    { name: "Owner", value: `<@${bot.Owner}>, ${bot.Owner}`, inline: false },
                    { name: "Client ID", value: bot.ClientID, inline: false },
                    { name: "Price", value: `${bot.Price}¢`, inline: false },
                    { name: "Start Time", value: `${bot.startTime} `, inline: false },
                    { name: "End Time", value: `${bot.endTime} `, inline: false }
                )
                .setFooter({ text: "Bot Information", iconURL: client.user.avatarURL() })
                .setTimestamp();

            return interaction.reply({
                embeds: [botEmbed],
                ephemeral: true
            });

        } catch (error) {
            console.error("Error fetching user bots:", error);
            return interaction.reply({
                content: "An error occurred while fetching the user's bots.",
                ephemeral: true
            });
        }
    },
};
