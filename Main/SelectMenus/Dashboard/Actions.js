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

const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const config = require("../../Resources/Config.json");
const moment = require('moment-timezone');
const Tokens = new Database("/Database/Others/Tokens.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const RunDB = new Database("/Database/BotMaker/RunBots");
const Lan = new Database("/Database/Others/Language.json");
const Prices = new Database("/Database/BotMaker/Prices.json");
const commandsData = require('../../Resources/Aliases.json'); 
let aliasesdb = new Database('/Database/Others/Aliases.json');
const Colors = require("../../Resources/Colors.json");
const OwnerDB = new Database("/Database/Others/OwnerData");

module.exports = {
    name: "select-action",
    usage: [],
    botPermission: [],
    authorPermission: [],
    cooldowns: [0],
    ownerOnly: false,
    run: async (client, interaction, Text) => {
        try {
            const bots = Tokens.get('Bots') || [];

            const botID = interaction.values[0].split("_")[0].trim();  
            const Selected = interaction.values[0].split("_")[1].trim();  
            const balanceSchema = require('../../../Schema/Balance');
            const userBots = (bots || []).filter(bot => bot.ClientID === botID);
            const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
            if (!isOwner) { 
                return interaction.reply({ 
       			    content: Text.NoPrem,
                    ephemeral: true 
                });
            }
            
            if (Selected === "config") {

                const Language = await Lan.get(botID);
                let emot;
                let lang;
                let ss;
                const Status = await RunDB.get(botID);
                let emott;
                let text;
                let desc;
                if (Status) {
                    emott = '<:pause:1351968744179630240>';
                    desc = 'لإيقاف البوت';
                    text = 'إيقاف';
                } else { 
                    emott = '<:run:1351968693244133489>';
                    desc = 'لتشغيل البوت';
                    text = 'تشغيل';
                }
                if (Language === "Ar") {
                    emot = "<:En:1319705254194843718>";
                    lang = "الإنجليزية";
                    ss = "En";
                } else {
                    emot = "<:Ar:1319706110923505817>";
                    lang = "العربية";
                    ss = "Ar";
                }

                const menu = new StringSelectMenuBuilder()
                    .setCustomId('select-actions')
                    .setPlaceholder('اختر إجراء للبوت')
                    .addOptions([
                        {
                            label: text, 
                            description: desc,
                            value: `${botID}_status_${text}`, 
                            emoji: emott
                        },
                        {
                            label: 'تغيير اللغة', 
                            description: "تبديل لغة البوت إلى " + lang + ".",
                            value: `${botID}_ChangeLanguage_${ss}`, 
                            emoji: emot
                        },
                        {
                            label: 'تغيير المالك', 
                            description: 'نقل ملكية البوت إلى مستخدم آخر.',
                            value: `${botID}_changeOwner`, 
                            emoji: '<:ship:1319711155157074081>'
                        },
                        {
                            label: 'تغيير البادئة', 
                            description: 'تغيير بادئة أوامر البوت.',
                            value: `${botID}_changePrefix`, 
                            emoji: '<:Prefix:1393592410440732733>'
                        },
                        {
                            label: 'إضافة أيام', 
                            description: 'تجديد البوت أو إضافة أيام إضافية لمدة تشغيله.',
                            value: `${botID}_renew`, 
                            emoji: '<:Add:1302245462887235667>'
                        },
                        {
                            label: 'المسؤولون', 
                            description: 'إضافة، إزالة، أو عرض مسؤولي البوت.', 
                            value: `${botID}_admins`, 
                            emoji: '<:Admins:1393592375594717244>'
                        }
                    ]);

                const DashSelection = new ActionRowBuilder().addComponents(menu);
                await interaction.update({ components: [DashSelection] });

            } else if (Selected === "manage-commands") {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId('manage-commands')
                    .setPlaceholder('اختر إجراء للأوامر')
                    .addOptions([
                        {
                            label: 'إضافة اختصارات', 
                            description: 'يمكنك إضافة اختصار لكل أمر.',
                            value: `${botID}_addaliases`, 
                            emoji: '<:Add:1302245462887235667>'
                        },
                        {
                            label: 'حذف اختصارات', 
                            description: 'إزالة اختصاراتك من أوامر البوت.',
                            value: `${botID}_renaliases`, 
                            emoji: '<:signdelete:1293713971945144493>'
                        },
                        {
                            label: 'قائمة الاختصارات', 
                            description: 'عرض جميع اختصارات أوامر البوت الخاصة بك.',
                            value: `${botID}_all`, 
                            emoji: '<:Keyboard:1393599848917237873>'
                        }
                    ]);

                const DashSelection = new ActionRowBuilder().addComponents(menu);
                await interaction.update({ components: [DashSelection] });

            } else if (Selected === "others") {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId('others')
                    .setPlaceholder('اختر إجراء')
                    .addOptions([
                        {
                            label: 'تثبيت البوت بقناة صوتية', 
                            description: 'تثبيت بوتك بروم صوتي خاص (تعمل لبوت واحد داخل الخادم).',
                            value: `${botID}_voiceafk`, 
                            emoji: '<:Microphone:1393423390420766933>'
                        },
                        {
                            label: 'إضافة للقائمة السوداء', 
                            description: 'حظر مستخدم أو قناة من استخدام أوامر البوت.',
                            value: `${botID}_blacklist_add`, 
                            emoji: '<:Add:1302245462887235667>'
                        },
                        {
                            label: 'إزالة من القائمة السوداء', 
                            description: 'رفع الحظر عن مستخدم أو قناة.',
                            value: `${botID}_blacklist_remove`, 
                            emoji: '<:Remove:1293713971945144493>'
                        },
                        {
                            label: 'قائمة الحظر', 
                            description: 'عرض جميع المستخدمين والقنوات المحظورة.',
                            value: `${botID}_blacklistlist`, 
                            emoji: '<:Keyboard:1393599848917237873>'
                        }
                    ]);
                const DashSelection = new ActionRowBuilder().addComponents(menu);
                await interaction.update({ components: [DashSelection] });

            } else if (Selected === "permissions") {
			//if (interaction.user.id !== "941085346886717480") return;
                const menu = new StringSelectMenuBuilder()
                    .setCustomId('permissionss')
                    .setPlaceholder('اختر إجراء للصلاحيات')
                    .addOptions([
                        {
                            label: 'إضافة صلاحيات', 
                            description: 'منح صلاحيات مستخدمين محددين.',
                            value: `${botID}_add`
                        },
                        {
                            label: 'حذف صلاحيات', 
                            description: 'سحب صلاحيات الوصول من مستخدمين معينين.',
                            value: `${botID}_remove`
                        },
                        {
                            label: 'قائمة الصلاحيات', 
                            description: 'عرض جميع الأدوار والمستخدمين ذوي الصلاحيات الخاصة.',
                            value: `${botID}_list`
                        }
                    ]);
                const DashSelection = new ActionRowBuilder().addComponents(menu);
                await interaction.update({ components: [DashSelection] });

            } else if (Selected === "Api") {
                await interaction.reply({ content: `هذه الميزة غير متاحة لهذا البوت.`, ephemeral: true });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'حدث خطأ غير متوقع. الرجاء المحاولة لاحقًا.', ephemeral: true });
        }
    }
};
