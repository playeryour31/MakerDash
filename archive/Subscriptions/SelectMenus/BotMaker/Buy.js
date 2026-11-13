const {
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { Database } = require("st.db");
const coinsDB = new Database("./Database/BotMaker/Balance.json");
const priceDB = new Database("./Subscriptions/Database/Others/Prices.json");
let bots = new Database("./Main/Resources/Bots.json");
let Colors = require("../../../Main/Resources/Colors.json");
const Status = new Database('./Subscriptions/Database/Others/ConfigStatus');

module.exports = {
    name: "buybot-Selector",
    description: "",
    usage: [""],
    botPermission: [""],
    authorPermission: [""],
    cooldowns: [0],
    ownerOnly: false,

    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        try {
            const { Blacklist } = require("../../../Schema/Blacklist");
            const isBlacklisted = await Blacklist.findOne({ UserID: interaction.user.id });

            if (isBlacklisted) {
                return interaction.reply({
                    content: "You are blacklisted.",
                    ephemeral: true,
                });
            }

            const balanceSchema = require('../../../Schema/Balance');
            const Selected = interaction.values[0]?.split("_")[0]?.trim();
            const bot = bots.get(Selected);
			const StatusBots = Status.get(`${client.user.id}_${interaction.guild.id}_${Selected}`) || "On";
			const StatusAllBots = Status.get(`${client.user.id}_${interaction.guild.id}_Bot`) || "On";
            if (!bot) {
                const embed = new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setTitle("Bot Not Found")
                    .setDescription("The bot you are trying to purchase is not available.");
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            if (!bot.purchaseStatus) {
                const embed = new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setTitle("Purchase Temporarily Disabled")
                    .setDescription(`The purchase for **${Selected} Bot** is currently disabled. Please try again later.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

			if (StatusAllBots === "Off") { 
               const embed = new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setTitle("Purchase Temporarily Disabled")
                    .setDescription(`The purchase for Bots is currently disabled. Please try again later.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            } 
			if (StatusBots === "Off") { 
               const embed = new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setTitle("Purchase Temporarily Disabled")
                    .setDescription(`The purchase for **${Selected} Bot** is currently disabled. Please try again later.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            } 



            let userdata = await balanceSchema.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
            let usercoins = userdata?.balance || 0;
            const botPrice = priceDB.get(`${bot.priceKey}_${interaction.guild.id}_${client.user.id}`) || 1;

            if (usercoins < botPrice) {
                const embed = new EmbedBuilder()
                    .setColor(Colors.Warn)
                    .setTitle("Insufficient Balance")
                    .setDescription(`You do not have enough coins to purchase **${bot.name} Bot**.
> **Price:** ${botPrice} coins
> **Your Balance:** ${usercoins} coins
-# Buy more coins and try again!`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(interaction.guild.members.me?.displayColor)
                .setDescription(`## Buy ${bot.name} Bot
> ${bot.descriptionLarge}

> -# ${Selected} Bot Price **[ __${botPrice}__ ]**
                `);

            const button = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${Selected}_continue`)
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel("Buy"),
                    new ButtonBuilder()
                        .setCustomId("cancel")
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel("Cancel")
                );

            
            interaction.reply({ embeds: [embed], components: [button], ephemeral: true }).then(async (msg) => {
                const collector = interaction.channel.createMessageComponentCollector({
                    filter: (i) => i.user.id === interaction.user.id,
                    time: 30000,
                    max: 1,
                });

                collector.on("collect", async (i) => {
                    await msg.delete().catch(error => console.log("Error deleting message: ", error));
                });

                collector.on("end", (collected) => {
                    if (collected.size === 0) {
                        msg.delete().catch(error => console.log("Error deleting message: ", error));
                    }
                });
            });
        } catch (error) {
            console.log("An error occurred: ", error);
            interaction.reply({ content: "Something went wrong while processing your request. Please try again later.", ephemeral: true });
        }
    }
};
