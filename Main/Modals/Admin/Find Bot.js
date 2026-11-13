const {
    Client,
    EmbedBuilder,
    ChatInputCommandInteraction
} = require("discord.js");

const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const Prices = new Database("/Database/BotMaker/Prices.json");
const Tokens = new Database("/Database/Others/Tokens.json");
const balanceSchema = require('../../../Schema/Balance');
const config = require('../../Resources/Config.json');
const Colors = require("../../Resources/Colors.json");

module.exports = {
    name: "find-bot-modal",
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
             const id = interaction.fields.getTextInputValue('bot-input-id');
         const bots = Tokens.get('Bots') || [];
        const userBots = bots.filter(bot => bot.ClientID === id);
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
        } catch (error) {
            console.error(error);
            await interaction.reply({  content: "An error occurred while fetching the user's bots.", ephemeral: true });
        }
    }
};
