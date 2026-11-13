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
    EmbedBuilder
} = require("discord.js");

const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const config = require("../../Resources/Config.json");
const moment = require('moment-timezone');
const Tokens = new Database("/Database/Others/Tokens.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const Lan = new Database("/Database/Others/Language.json");
const RunDB = new Database("/Database/BotMaker/RunBots");
const Prices = new Database("/Database/BotMaker/Prices.json");
const commandsData = require('../../Resources/Aliases.json'); 
const aliasesdb = new Database('/Database/Others/Aliases.json');
const Colors = require("../../Resources/Colors.json");
const OwnerDB = new Database("/Database/Others/OwnerData");
const { syncBotsToApiBackground } = require('../../../src/shared/services/tokensWriteBridge');

module.exports = {
    name: "select-actions",
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
            const userBots = (bots || []).filter(bot => bot.ClientID === botID);
            const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
            if (!isOwner) { 
                return interaction.reply({ 
                    content: Text.NoPrem || 'ليس لديك صلاحية لإدارة هذا البوت.',
                    ephemeral: true 
                });
            }

            const logChannel = client.channels.cache.get(config.LogChannels.ConfigChannel);

            if (Selected === "status") {
                const BotStatus = interaction.values[0].split("_")[2].trim();  
                const user = interaction.member ? interaction.member.displayName : interaction.user.username;
                const TheBot = await client.users.fetch(botID).catch(() => ({ username: botID }));

                if (BotStatus === "Shutdown") { 
                    await RunDB.set(botID, false);
                    interaction.update({ 
                        embeds: [new EmbedBuilder()
                            .setDescription(`<:signcheck:1293713968266874952> تم إيقاف تشغيل البوت **${TheBot.username}** بنجاح.`)
                            .setColor("#2DCC70")
                        ], 
                        ephemeral: false,
                        components: []
                    });

                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setColor("#E84C3D")
                            .setDescription("<:signcheck:1293713968266874952> تم إيقاف البوت")
                            .addFields(
                                { name: 'البوت:', value: `${TheBot.username || "غير معروف"}`, inline: true },
                                { name: 'المعرف:', value: `${botID}`, inline: true },
                                { name: 'الإجراء:', value: "إيقاف التشغيل", inline: true },
                                { name: 'بواسطة:', value: `<@${interaction.user.id}>`, inline: true }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [embed] });
                    }
                } else { 
                    await RunDB.set(botID, true);
                    interaction.update({ 
                        embeds: [new EmbedBuilder()
                            .setDescription(`<:signcheck:1293713968266874952> البوت **${TheBot.username}** يعمل الآن.`)
                            .setColor("#2DCC70")
                        ], 
                        ephemeral: false,
                        components: [] 
                    });

                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setColor("#2DCC70")
                            .setTitle("تم تشغيل البوت")
                            .addFields(
                                { name: 'البوت:', value: `${TheBot.username || "غير معروف"}`, inline: true },
                                { name: 'المعرف:', value: `${botID}`, inline: true },
                                { name: 'الإجراء:', value: "تشغيل", inline: true },
                                { name: 'بواسطة:', value: `<@${interaction.user.id}>`, inline: true }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [embed] });
                    }
                }
            } 
            else if (Selected === "changeOwner") {
                const OwnerModal = new ModalBuilder()
                    .setCustomId(`${botID}_updateowner`)
                    .setTitle(`تغيير مالك البوت`);

                const the_newOwnerID = new TextInputBuilder()
                    .setCustomId('newownerid')
                    .setRequired(true)
                    .setPlaceholder(`مثال: 123456789012345678`)
                    .setLabel("معرف المالك الجديد")
                    .setStyle(TextInputStyle.Short);

                OwnerModal.addComponents(new ActionRowBuilder().addComponents(the_newOwnerID));
                await interaction.showModal(OwnerModal);
            } 
            else if (Selected === "changePrefix") {
                const OwnerModal = new ModalBuilder()
                    .setCustomId(`${botID}_changePrefix`)
                    .setTitle(`تغيير بادئة البوت`);

                const the_newPrefix = new TextInputBuilder()
                    .setCustomId('newPrefix')
                    .setRequired(true)
                    .setPlaceholder(`مثال: !, ?, $`)
                    .setLabel("البادئة الجديدة")
                    .setStyle(TextInputStyle.Short);

                OwnerModal.addComponents(new ActionRowBuilder().addComponents(the_newPrefix));
                await interaction.showModal(OwnerModal);
            } 
            else if (Selected === "ChangeLanguage") {
                const botLanguage = interaction.values[0].split("_")[2].trim();
                const userID = interaction.user.id;
                const lastLanguage = Lan.get(botID) || "غير محددة";
                const TheBot = await client.users.fetch(botID).catch(() => botID);

                await Lan.set(botID, botLanguage);

                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(botLanguage === 'Ar' ? '#005430' : '#002147')
                        .setTitle("تم تحديث لغة البوت")
                        .addFields(
                            { name: 'البوت:', value: `${TheBot.username || "غير معروف"}`, inline: true },
                            { name: 'المعرف:', value: `${TheBot.id || botID}`, inline: true },
                            { name: 'اللغة الجديدة:', value: `${botLanguage === 'Ar' ? 'العربية' : 'الإنجليزية'}`, inline: true },
                            { name: 'اللغة السابقة:', value: lastLanguage, inline: true },
                            { name: 'المستخدم:', value: `<@${userID}>`, inline: true }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] });
                }

                await interaction.reply({ 
                    content: `تم تحديث لغة البوت إلى ${botLanguage === 'Ar' ? 'العربية' : 'الإنجليزية'}.`, 
                    ephemeral: true 
                });
             } else if (Selected === "admins") {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId('admins-actions')
                    .setPlaceholder('اختر إجراء للمسؤولين')
                    .addOptions(
                        {
                            label: 'قائمة المسؤولين', 
                            description: 'عرض جميع المسؤولين بصلاحيات محددة.',
                            value: `${botID}_adminslist`,
                            emoji: '<:Keyboard:1393599848917237873>'
                        },
                        {
                            label: 'إضافة مسؤول', 
                            description: 'منح صلاحيات المسؤول لدور أو مستخدم محدد.',
                            value: `${botID}_add`,
                            emoji: '<:Add:1302245462887235667>'
                        },
                        {
                            label: 'إزالة مسؤول', 
                            description: 'إلغاء صلاحيات المسؤول من دور أو مستخدم محدد.',
                            value: `${botID}_remove`,
                            emoji: '<:Remove:1293713971945144493>'
                        },
                        {
                            label: 'تعديل صلاحيات المسؤول', 
                            description: 'تعديل صلاحيات المسؤول لدور أو مستخدم معين.',
                            value: `${botID}_modifyadminpermissions`,
                            emoji: '<:Edit:1393601860274884782>'
                        }
                    );
                const row = new ActionRowBuilder().addComponents(menu);

                await interaction.update({
                    components: [row]
                });
 } else if (Selected === "renew") {
  const balanceSchema = require('../../../Schema/Balance');
    const RenewTime = 30;
    const maxRenewDays = 30;
    const bots = Tokens.get('Bots') || [];
    const bot = bots.find(bot => bot.ClientID === botID);

    if (!bot) return interaction.reply({ content: "لم يتم العثور على المعلومات.", ephemeral: true });

    const Type = bot.Type;
    const RenewPrice = await Prices.get(`${Type}P_${interaction.guild.id}`) || 10000;
    const userdata = await balanceSchema.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
    const usercoins = userdata?.balance || 0;
    const currentEndTime = new Date(bot.endTime);
    const currentTime = new Date();
    const daysLeft = Math.floor((currentEndTime - currentTime) / (1000 * 60 * 60 * 24));
    const TheBot = await client.users.fetch(botID).catch(() => ({ username: botID }));
    const adminChannel = await client.channels.fetch(config.LogChannels.ConfigChannel).catch(() => null);
    if (usercoins < RenewPrice) {
        return interaction.reply({ content: `لا يوجد رصيد كافي. المطلوب: ${RenewPrice}، لديك: ${usercoins}.`, ephemeral: true });
    }

        if (daysLeft > maxRenewDays) {
            return interaction.reply({ content: `لا يمكن التجديد اكقر من ${maxRenewDays} يوم.`, ephemeral: true });
        }

    userdata.balance -= RenewPrice;
    userdata.save().then(async () => {
        const newEndTime = new Date(currentEndTime);
        newEndTime.setDate(newEndTime.getDate() + RenewTime);
        const totalDays = Math.floor((newEndTime - currentTime) / (1000 * 60 * 60 * 24));
        bot.endTime = newEndTime.toISOString();
        Tokens.set('Bots', bots);
        syncBotsToApiBackground(bots);

const embed = new EmbedBuilder()
    .setTitle("تم تجديد البوت بنجاح")
    .setColor(Colors.LighGreen)
    .addFields(
        { name: 'اسم البوت:', value: `${TheBot.username || "غير معروف"}`, inline: true },
        { name: 'تاريخ الانتهاء الجديد:', value: `${newEndTime.toLocaleString()}`, inline: true },
        { name: 'المبلغ المخصوم:', value: `${RenewPrice} عملة`, inline: true },
        { name: 'عدد الأيام المتبقية:', value: `${totalDays} يوم`, inline: true }
    )
    .setTimestamp();

if (adminChannel) await adminChannel.send({ embeds: [embed] });


        const ssssss = new EmbedBuilder()
            .setDescription(`<:signcheck:1293713968266874952> **تم تجديد البوت بنجاح**`)
            .setColor(Colors.LighGreen);
        await interaction.update({ embeds: [ssssss], components: [] });
    });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: 'حدث خطأ غير متوقع. الرجاء المحاولة لاحقًا.', 
                ephemeral: true 
            });
        }
    }
};
