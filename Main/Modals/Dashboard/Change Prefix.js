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
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));

const Tokens = new Database("/Database/Others/Tokens.json");
const PrefixDB = new Database("/Database/Others/PrefixData");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const Prices = new Database("/Database/BotMaker/Prices.json");
const config = require('../../Resources/Config.json');
const Colors = require("../../Resources/Colors.json");

module.exports = {
    name: "changePrefix",
    ownerOnly: false,
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        try {
            const balanceSchema = require('../../../Schema/Balance');
            const bots = Tokens.get('Bots') || [];
            const botID = interaction.customId.split("_")[0].trim();
            const newPrefix = interaction.fields.getTextInputValue('newPrefix');
            const ChangePrice = Prices.get(`PrefixP_${interaction.guild.id}`) || 1;
            const SendPriviety = client.channels.cache.get(config.LogChannels.ConfigChannel);
            const userdata = await balanceSchema.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
            const usercoins = userdata?.balance || 0;

            if (usercoins < ChangePrice) {
                return interaction.reply({
                    content: 'You do not have enough balance to change the bot prefix.',
                    ephemeral: true
                });
            }
            try {
                userdata.balance -= ChangePrice;
                await userdata.save();
                PrefixDB.set(`Prefix_${botID}`, newPrefix);

                const TheBot = await client.users.fetch(botID).catch(() => botID);

                const PrefixLogEmbed = new EmbedBuilder()
                    .setColor(Colors.LighGreen)
                    .setTitle('Bot Prefix Updated')
                    .addFields(
                        { name: 'Bot:', value: `${TheBot.username}`, inline: true },
                        { name: 'Bot ID:', value: `${TheBot.id}`, inline: true },
                        { name: 'New Prefix:', value: `\`${newPrefix}\``, inline: true },
                        { name: 'User:', value: `<@${interaction.user.id}>`, inline: true }
                    )
                    .setTimestamp();

                if (SendPriviety) {
                    SendPriviety.send({ embeds: [PrefixLogEmbed] });
                }
                interaction.update({ 
                    embeds:[new EmbedBuilder().setDescription(`تم تحديث بادئة البوت بنجاح إلى\` ${newPrefix}\`.`).setColor(Colors.Main)], 
                    ephemeral: true 
                });
            } catch (error) {
                console.error("Error saving to database:", error);
                return interaction.reply({
                    content: 'An error occurred while updating the prefix. Please try again.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error("An error occurred:", error);
            return interaction.reply({
                content: 'An unexpected error occurred. Please try again later.',
                ephemeral: true
            });
        }
    }
};
