const {
    Client,
    Collection,
    Discord,
    createInvite,
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
    SlashCommandBuilder,
    ChatInputCommandInteraction
} = require("discord.js");

const moment = require('moment-timezone');
moment.tz.setDefault('Africa/Cairo');

const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const aliasesdb = new Database('/Database/Others/Aliases.json');
const Tokens = new Database("/Database/Others/Tokens.json");
const Prices = new Database("/Database/BotMaker/Prices.json");
const AdminsDB = new Database("/Database/BotMaker/Admins.json"); 
const coinsDB = new Database("/Database/BotMaker/Balance.json");
const config = require("../../Resources/Config.json");
const Colors = require("../../Resources/Colors.json");
module.exports = {
    name: "admins",
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            let id = interaction.customId.split("_")[2]?.trim();
            let action = interaction.customId.split("_")[1]?.trim();
            let adminID = interaction.fields.getTextInputValue("id").trim();
            let TheBot = await client.users.fetch(id).catch(() => id);
            let bots = Tokens.get('Bots') || [];
            let userBots = bots.filter(bot => bot.ClientID === id);

            const Balance = require('../../../Schema/Balance');
            let userdata = await Balance.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
            let usercoins = userdata?.balance || 0;

            if (action === "add") {
                let price = 0;
                if (usercoins < price) {
                    return interaction.reply({ 
                        content: `رصيدك غير كافٍ. تكلفة إضافة مسؤول جديد هي ${price} كوينز.`, 
                        ephemeral: true 
                    });
                }

                let admins = AdminsDB.get(`Admins_${id}`) || [];
                if (admins.includes(adminID)) {
                    return interaction.reply({ 
                        content: `هذا المستخدم مضاف مسبقًا كمسؤول لهذا البوت.`, 
                        ephemeral: true 
                    });
                }

                admins.push(adminID);
                AdminsDB.set(`Admins_${id}`, admins);

                userdata.balance -= price;
                await Balance.updateOne(
                    { userid: interaction.user.id, guild: interaction.guild.id },
                    { balance: userdata.balance }
                );

                interaction.update({ 
                    embeds:[new EmbedBuilder().setDescription(`تمت إضافة <@${adminID}> كمسؤول للبوت ${TheBot.username} بنجاح.`).setColor(Colors.Main)], 
                    ephemeral: true 
                });

                const logEmbed = new EmbedBuilder()
                    .setTitle("تمت إضافة مسؤول")
                    .addFields(
                        { name: "المستخدم", value: `${interaction.user}, (${interaction.user.id})`, inline: true },
                        { name: "البوت", value: `${TheBot.username}, (${TheBot.id})`, inline: true },
                        { name: "المسؤول الجديد", value: `<@${adminID}>`, inline: true },
                        { name: "السعر", value: `${price} كوينز`, inline: true },
                        { name: "الوقت", value: `${moment().format('YYYY-MM-DD HH:mm:ss')}`, inline: true }
                    )
                    .setColor(Colors.LighGreen);

                const logChannel = client.channels.cache.get(config.LogChannels.ConfigChannel);
                logChannel?.send({ embeds: [logEmbed] });

            } else if (action === "remove") {
                let admins = AdminsDB.get(`Admins_${id}`) || [];
                if (!admins.includes(adminID)) {
                    return interaction.reply({ 
                        content: `هذا المستخدم ليس من مسؤولي هذا البوت.`, 
                        ephemeral: true 
                    });
                }

                admins = admins.filter(admin => admin !== adminID);
                AdminsDB.set(`Admins_${id}`, admins);

                interaction.update({ 
                    embeds:[new EmbedBuilder().setDescription(`تمت إزالة <@${adminID}> من قائمة مسؤولي البوت ${TheBot.username}.`).setColor(Colors.Main)], 
                    ephemeral: true 
                });

                const logEmbed = new EmbedBuilder()
                    .setTitle("تمت إزالة مسؤول")
                    .addFields(
                        { name: "المستخدم", value: `${interaction.user}, (${interaction.user.id})`, inline: true },
                        { name: "البوت", value: `${TheBot.username}, (${TheBot.id})`, inline: true },
                        { name: "المسؤول المحذوف", value: `<@${adminID}>`, inline: true },
                        { name: "الوقت", value: `${moment().format('YYYY-MM-DD HH:mm:ss')}`, inline: true }
                    )
                    .setColor(Colors.RedWarn);

                const logChannel = client.channels.cache.get(config.LogChannels.ConfigChannel);
                logChannel?.send({ embeds: [logEmbed] });
            }
            
        } catch (error) {
            console.error(error);
            interaction.reply({ 
                content: `حدث خطأ أثناء تنفيذ الطلب. الرجاء المحاولة مرة أخرى لاحقًا.`, 
                ephemeral: true 
            });
        }
    }
};
