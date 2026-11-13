const moment = require("moment");
const {
    Client,
    Collection,
    WebhookClient,
    PermissionsBitField,
    GatewayIntentBits,
    Partials,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    Events,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContextMenuCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

const { Database } = require("st.db");
const BotMakerDB = new Database("./Database/BotMaker/Data.json");
const BalanceDB = new Database("./Database/BotMaker/Balance.json");
const checkdb = new Database("./Database/Others/BuyerChecker.json");
const config = require("../../../Main/Resources/Config.json");
const logsdb = new Database("./Database/BotMaker/Logs.json");
const blacklist = new Database("./Database/BotMaker/Blacklisted.json");
const StatusDB = new Database("./Database/BotMaker/ConfigStatus.json");
const { DatebaseLogger } = require('../../Functions/Database/DatebaseLogger');
const PricesDB = new Database("./Subscriptions/Database/Others/Prices.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy coins')
        .addSubcommand(subcommand =>
            subcommand.setName('coins')
                .setDescription("Buy coins for your balance")
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('Amount of coins to buy')
                        .setRequired(true)
                )
        ),
    botP: [PermissionsBitField.Flags.Administrator],
    P: "Administrator",
    ownerOnly: false,
    cooldown: 10000,
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async run(client, interaction, language, reply, embeds) {
        try {
            const amount = interaction.options.getInteger('quantity');
            const data = BotMakerDB.get(`BotMakerData_${client.user.id}_${interaction.guild.id}`) || {};
            const botData = BalanceDB.get(`SubscriptionData_${client.user.id}`) || {};
            const currentStatus = StatusDB.get(`${client.user.id}_${interaction.guild.id}_Coins`) || "On";
            const balanceSchema = require("../../../Schema/Balance");

            if (currentStatus === "Off") {
                return interaction.reply({ content: "Buying coins is currently unavailable.", ephemeral: true });
            }
            
            if (checkdb.get(`${interaction.user.id}_${interaction.guild.id}`)) {
                return interaction.reply({ content: "You already have an ongoing purchase!", ephemeral: true });
            }
            
            if (!data.bank || !data.probot) {
                return interaction.reply({ content: "The bot system is not fully configured. Please contact an administrator.", ephemeral: false });
            }
            
            if (!botData.Balance || botData.Balance < amount) {
                return interaction.reply({ content: `You can buy only \`${botData.Balance || 0}\` coins for now!`, ephemeral: false });
            }
            
            const coinsPrice = PricesDB.get(`CoinsP_${interaction.guild.id}_${client.user.id}`) || 10;
            const price = coinsPrice * amount;
            const totalPrice = Math.floor(price * (20 / 19) + 1);
            
            let embed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayColor)
                .setDescription(`\`\`\`c ${data.bank} ${totalPrice}\`\`\``);

            let button = new ActionRowBuilder()
                .addComponents(new ButtonBuilder()
                    .setCustomId('copy')
                    .setLabel('Copy')
                    .setStyle(ButtonStyle.Secondary));

            const msg = await interaction.reply({ embeds: [embed], components: [button], ephemeral: false });
            checkdb.set(`${interaction.user.id}_${interaction.guild.id}`, true);

            const filter = (response) =>
                response.content.includes(`${data.bank}`) &&
                response.author.id === data.probot &&
                response.content.includes(price.toString());

            const collector = interaction.channel.createMessageCollector({ filter, time: 120000 });

            collector.on("collect", async () => {
                botData.Balance -= amount;
                await BalanceDB.set(`SubscriptionData_${client.user.id}`, botData);

                let userdata = await balanceSchema.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
                if (userdata) {
                    userdata.balance += amount;
                } else {
                    userdata = new balanceSchema({
                        userid: interaction.user.id,
                        guild: interaction.guild.id,
                        balance: amount
                    });
                }
                await userdata.save();

                let logId = logsdb.get(`LogID`) || 1;
                logsdb.push(`Logs_${interaction.user.id}`, {
                    id: logId,
                    reason: `Buy coins`,
                    amount: amount,
                    price: price,
                    status: 'added',
                    action: 'success',
                    date: moment().format('YYYY-MM-DD HH:mm'),
                });
                logsdb.set(`LogID`, logId + 1);
          DatebaseLogger(client, "BuyCoins", interaction, amount, price);

                await interaction.channel.send(`Successfully added \`${amount}\` coins to <@${interaction.user.id}>.`);
                await msg.delete().catch(() => {});
                checkdb.delete(`${interaction.user.id}_${interaction.guild.id}`);
                collector.stop();
            });

            collector.on("end", collected => {
                if (collected.size === 0) {
                    checkdb.delete(`${interaction.user.id}_${interaction.guild.id}`);
                    interaction.channel.send(`<@${interaction.user.id}>, time expired! Do not transfer now.`).catch(() => {});
                    msg.delete().catch(() => {});
                }
            });

        } catch (error) {
                    checkdb.delete(`${interaction.user.id}_${interaction.guild.id}`);
            console.error(error);
            return interaction.reply({ content: "An unexpected error occurred while processing your request.", ephemeral: true });
        }
    },
};
