const {
    Client,
    Collection,
    Discord,
    createInvite,
    ChannelType,
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
    SlashCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    EmbedBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const moment = require('moment-timezone');
const { Database } = require("st.db");

const Tokens = new Database("/Database/Others/Tokens.json");
const OwnerDB = new Database("/Database/Others/OwnerData");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const Prices = new Database("./Subscriptions/Database/Others/Prices.json");
const config = require("../../../Main/Resources/Config.json");
const Colors = require("../../../Main/Resources/Colors.json");

module.exports = {
    name: "updateowner",
    ownerOnly: false,
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        try {
            const balanceSchema = require('../../../Schema/Balance');
            const bots = Tokens.get('Bots') || [];
            const botID = interaction.customId.split("_")[0].trim();
            const newOwnerID = interaction.fields.getTextInputValue('newownerid');
            const oldOwnerID = interaction.user.id;
            const data = BotMakerDB.get(`BotMakerData_${client.user.id}_${interaction.guild.id}`)
            const logs = data?.privateLogs;
            const SendPriviety = client.channels.cache.get(logs);

            const botIndex = bots.findIndex(bot => bot.ClientID === botID && bot.Owner === oldOwnerID);
            const bot = bots[botIndex];



            if (isNaN(newOwnerID)) {
                return interaction.reply({
                    content: `You have entered the bot owner's ID incorrectly.\nExample: **941085346886717480**`,
                    ephemeral: true
                });
            }

            const ChangePrice = Prices.get(`OwnerP_${interaction.guild.id}_${client.user.id}`) || 1;

            const userdata = await balanceSchema.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
            const usercoins = userdata?.balance || 0;

            if (usercoins < ChangePrice) {
                return interaction.reply({
                    content: 'You do not have enough balance to proceed.',
                    ephemeral: true
                });
            }

            bot.Owner = newOwnerID;

            try {
                userdata.balance -= ChangePrice;
                await userdata.save();
                const TheBot = await client.users.fetch(bot.ClientID).catch(() => bot.ClientID);

                bots[botIndex].Owner = newOwnerID;
                Tokens.set('Bots', bots);
                OwnerDB.set(`Owner_${botID}`, newOwnerID);
           		 bot.Owner = newOwnerID;

                const OwnerLogEmbed = new EmbedBuilder()
                    .setColor(Colors.LighGreen)
                    .setTitle('Bot Ownership Updated')
                    .addFields(
                        { name: 'Bot:', value: `${TheBot.username}`, inline: true },
                        { name: 'Transaction ID:', value: `${bot.PurchasesID}`, inline: true },
                        { name: 'New Owner:', value: `<@${newOwnerID}>`, inline: true },
                        { name: 'Previous Owner:', value: `<@${oldOwnerID}>`, inline: true },
                        { name: 'User:', value: `<@${interaction.user.id}>`, inline: true }
                    )
                    .setTimestamp();

                if (SendPriviety) {
                    SendPriviety.send({ embeds: [OwnerLogEmbed] });
                }

                interaction.reply({
                    content: `The ownership of ${TheBot.username} has been successfully updated.`,
                    ephemeral: true
                });
            } catch (error) {
                console.error("Error saving to database:", error);
                return interaction.reply({
                    content: 'An error occurred while updating the owner. Please try again.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error("An error occurred:", error);
            return interaction.reply({
                content: 'An error occurred while processing the form. Please try again.',
                ephemeral: true
            });
        }
    }
};
