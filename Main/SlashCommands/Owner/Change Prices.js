const {
    SlashCommandBuilder,
    EmbedBuilder,
} = require("discord.js");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));

const botPrices = new Database("/Database/BotMaker/Prices.json");
const BotMakerDB = new Database("/Database/BotMaker/Data.json");
const bots = require("../../Resources/Bots.json");
const Colors = require("../../Resources/Colors.json");

const botOptions = Object.values(bots)
    .filter(bot => bot.type)
    .map(bot => ({
        name: bot.type,
        value: bot.priceKey
    }));

const Options = [
    ...botOptions,
    { name: "Makers", value: "Maker" },
    { name: "Coins", value: "Coins" },
    { name: "Change Owner", value: "OwnerP" },
    { name: "Change Languages", value: "LanguagesP" },
    { name: "Aliases", value: "AliasesP" }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("change")
        .setDescription("Change Bot Prices or Coins")
        .addSubcommand(subcommand =>
            subcommand
                .setName('prices')
                .setDescription("Change Bot Prices")
                .addStringOption(type => type
                    .setName("bot")
                    .setDescription("Select the bot")
                    .setRequired(true)
                    .addChoices(...Options))
                .addIntegerOption(number => number
                    .setName("price")
                    .setDescription("The price to set")
                    .setRequired(true)
                    .setMinValue(1))),
    ownerOnly: true,

    async run(client, interaction) {
        try {
            const bot = interaction.options.getString('bot');
            const price = interaction.options.getInteger('price');

            const botInfo = Options.find(option => option.value === bot);

            if (bot !== 'Coins') {
                await botPrices.set(`${bot}_${interaction.guild.id}`, price);

                const embed = new EmbedBuilder()
                    .setTitle("Price Updated")
                    .setDescription(`The price for **${botInfo.name}** has been successfully changed to \`${price}\``)
                    .setColor(Colors.LighGreen);

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                await BotMakerDB.set(`CoinsP_${interaction.guild.id}`, price);

                const embed = new EmbedBuilder()
                    .setTitle("Coins Price Updated")
                    .setDescription(`The price for **Coins** has been successfully changed to \`${price}\``)
                    .setColor(Colors.LighGreen);

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error("Error executing this command:", error);

            const errorEmbed = new EmbedBuilder()
                .setDescription("An error occurred while executing this command. Please try again later.")

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
