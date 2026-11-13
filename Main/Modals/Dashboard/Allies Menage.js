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
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    Embed,
    ChatInputCommandInteraction
} = require("discord.js");

const moment = require('moment-timezone');
moment.tz.setDefault('Africa/Cairo');

const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const aliasesdb = new Database('/Database/Others/Aliases.json');
const Tokens = new Database("/Database/Others/Tokens.json");
const Prices = new Database("/Database/BotMaker/Prices.json");
const coinsDB = new Database("/Database/BotMaker/Balance.json");
const config = require("../../Resources/Config.json");
const Colors = require("../../Resources/Colors.json");
module.exports = {
    name: "modal-aliases",
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            let command = interaction.customId.split("_")[1]?.trim();
            let id = interaction.customId.split("_")[2]?.trim();
            let action = interaction.customId.split("_")[3]?.trim();
            let aliase = interaction.fields.getTextInputValue("aliase");
            let TheBot = await client.users.fetch(id).catch(() => id);

            let check = aliasesdb.get(`${aliase}_${id}`) || null;

            if (action == "add") {
                if (aliase == command) 
                    return interaction.reply({ 
                        content: `هذا البوت لديه بالفعل هذا الاسم المستعار لهذا الأمر.`, 
                        ephemeral: true 
                    });

                aliasesdb.set(`${aliase}_${id}`, command);
                const logEmbed = new EmbedBuilder()
                    .setTitle("تمت إضافة اسم الاختصار")
                    .addFields(
                        { name: "المستخدم", value: `${interaction.user}, (${interaction.user.id})`, inline: true },
                        { name: "البوت", value: `${TheBot.username}, (${TheBot.id})`, inline: true },
                        { name: "الأمر", value: `${command}`, inline: true },
                        { name: "الاسم المستعار", value: `${aliase}`, inline: true },
                        { name: "الوقت", value: `${moment().format('YYYY-MM-DD HH:mm:ss')}`, inline: true }
                    )
                    .setColor(Colors.LighGreen);

                const logChannel = client.channels.cache.get(config.LogChannels.ConfigChannel);
                logChannel?.send({ embeds: [logEmbed] });

                return interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor(Colors.Main)
                        .setDescription(`**<:signcheck:1293713968266874952> تم إضافة الاختصار '${aliase}' بنجاح.**`)
                    ],
                    components: []
                });

            } else if (action == "remove") {
                if (check != command) 
                    return interaction.reply({ 
                        content: `لم يتم العثور على اسم مستعار مطابق لهذا الأمر.`, 
                        ephemeral: true 
                    });

                aliasesdb.delete(`${aliase}_${id}`);
                const logEmbed = new EmbedBuilder()
                    .setTitle("تمت إزالة اسم الاختصار")
                    .addFields(
                        { name: "المستخدم", value: `${interaction.user}, (${interaction.user.id})`, inline: true },
                        { name: "البوت", value: `${TheBot.username}, (${TheBot.id})`, inline: true },
                        { name: "الأمر", value: `${command}`, inline: true },
                        { name: "الاسم المستعار", value: `${aliase}`, inline: true },
                        { name: "الوقت", value: `${moment().format('YYYY-MM-DD HH:mm:ss')}`, inline: true }
                    )
                    .setColor(Colors.RedWarn);

                const logChannel = client.channels.cache.get(config.LogChannels.ConfigChannel);
                logChannel?.send({ embeds: [logEmbed] });

                return interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor(Colors.Main)
                        .setDescription(`**<:signcheck:1293713968266874952> تم إزالة الاختصار '${aliase}' بنجاح.**`)
                    ],
                    components: []
                });
            }
        } catch (error) {
            console.error(error);
            interaction.reply({ 
                content: `حدث خطأ أثناء المعالجة. يرجى المحاولة مرة أخرى لاحقًا.`, 
                ephemeral: true 
            });
        }
    }
};
