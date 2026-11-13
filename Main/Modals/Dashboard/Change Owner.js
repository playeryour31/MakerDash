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
const OwnerDB = new Database("/Database/Others/OwnerData");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const Prices = new Database("/Database/BotMaker/Prices.json");
const config = require('../../Resources/Config.json');
const Colors = require("../../Resources/Colors.json");
const { syncBotsToApiBackground } = require('../../../src/shared/services/tokensWriteBridge');
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
            const data = BotMakerDB.get(`BotMakerData_${interaction.guild.id}`);
            const logs = data?.sellslog;
            const logChannel = client.channels.cache.get(logs);
            const SendPriviety = client.channels.cache.get(config.LogChannels.ConfigChannel);
            const botIndex = bots.findIndex(bot => bot.ClientID === botID && bot.Owner === oldOwnerID);

            if (isNaN(newOwnerID)) {
                return interaction.reply({
                    content: `لقد قمت بإدخال معرف المالك الجديد بشكل غير صحيح.\nمثال: **941085346886717480**`,
                    ephemeral: true
                });
            }

            bot.Owner = newOwnerID;

            try {
                const TheBot = await client.users.fetch(bot.ClientID).catch(() => bot.ClientID);

                bots[botIndex].Owner = newOwnerID;
                Tokens.set('Bots', bots);
                syncBotsToApiBackground(bots);
                OwnerDB.set(`Owner_${botID}`, newOwnerID);

                const OwnerLogEmbed = new EmbedBuilder()
                    .setColor(Colors.LighGreen)
                    .setTitle('تم تحديث ملكية البوت')
                    .addFields(
                        { name: 'البوت:', value: `${TheBot.username}`, inline: true },
                        { name: 'معرف البوت:', value: `${TheBot.id}`, inline: true },
                        { name: 'نوع البوت:', value: `${bot.Type}`, inline: true },
                        { name: 'رقم المعاملة:', value: `${bot.PurchasesID}`, inline: true },
                        { name: 'المالك الجديد:', value: `<@${newOwnerID}>`, inline: true },
                        { name: 'المالك السابق:', value: `<@${oldOwnerID}>`, inline: true },
                        { name: 'تم التغيير بواسطة:', value: `<@${interaction.user.id}>`, inline: true }
                    )
                    .setTimestamp();

                if (SendPriviety) {
                    SendPriviety.send({ embeds: [OwnerLogEmbed] });
                }
                interaction.update({ 
                    embeds:[new EmbedBuilder().setDescription(`تم تحديث ملكية البوت ${TheBot.username} بنجاح.`).setColor(Colors.Main)], 
                    ephemeral: true 
                });
            } catch (error) {
                console.error("خطأ أثناء الحفظ في قاعدة البيانات:", error);
                return interaction.reply({
                    content: 'حدث خطأ أثناء تحديث المالك. يرجى المحاولة مرة أخرى.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error("حدث خطأ:", error);
            return interaction.reply({
                content: 'حدث خطأ أثناء معالجة النموذج. يرجى المحاولة مرة أخرى.',
                ephemeral: true
            });
        }
    }
};
