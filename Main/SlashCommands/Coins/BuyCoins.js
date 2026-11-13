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
const BotMakerDB = new Database("/Database/BotMaker/Data.json");
const checkdb = new Database("/Database/Others/BuyerChecker.json");
const Paymentsdb = new Database("/Database/Payments/Coins.json");
const moment = require('moment-timezone');
const { Log } = require('../../Resources/Config.json');
const Config = require('../../Resources/Config.json');
const Colors = require('../../Resources/Colors.json');

module.exports = {
    data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Purchase Bots Panel")
    .addSubcommand(subcommand =>
      subcommand
        .setName('coins')
        .setDescription("Buy balance")
        .addIntegerOption(t => t
            .setName('amount')
            .setDescription(`Amount to buy`)
            .setRequired(true))),
    ownerOnly: false,

    async run(client, interaction) {
        try {
            const balanceSchema = require('../../../Schema/Balance');
            const amount = interaction.options.getInteger(`amount`);
            const data = BotMakerDB.get(`BotMakerData_${interaction.guild.id}`);
            const coinsPrice = BotMakerDB.get(`CoinsP_${interaction.guild.id}`) || 10;
            const price = coinsPrice * amount;
            const adminlog = interaction.guild.channels.cache.get(Config.LogChannels.AdminsLog);
            const totalPrice = Math.floor((price) * (20 / 19) + 1);
            const status = checkdb.get(`${interaction.user.id}_${interaction.guild.id}`);
            if (status) return interaction.reply({ content: `🚧 **انتظر!** لديك عملية شراء جارية بالفعل. يرجى الانتظار قليلاً!`, ephemeral: true });

            if (!data) {
                return interaction.reply(`⚠️ **خطأ:** لا يمكنك استخدام هذا الأمر حالياً.`);
            }

            const bank = data.bank;
            const probot = data.probot;
            if (!bank || !probot) {
                return interaction.reply(`⚠️ **تنبيه:** هذا الأمر غير متاح حالياً.`);
            }

            let embed = new EmbedBuilder()
                .setColor(Colors.Main)
                .setDescription(`\`\`\`c ${bank} ${totalPrice}\`\`\`\n-# - في حال كنت مهتما بلشراء العملات عن طريق وسائل دفع اخرى افتح تذكرة`);

            let button = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`copy`)
                        .setEmoji(`<:copy:1391931452173844592>`)
                        .setStyle(ButtonStyle.Secondary)
                );

            let embed1 = new EmbedBuilder()
                .setColor(Colors.Main)
                .setTitle(`عملية شراء`)
                .setDescription(`بدأ ${interaction.user} عملية شراء \`${amount}\` عملة.`);

            interaction.reply({ embeds: [embed], components: [button] }).then(async (msg) => {
                checkdb.set(`${interaction.user.id}_${interaction.guild.id}`, msg.id);

                let ad = null;
                if (adminlog) {
                    ad = await adminlog.send({ embeds: [embed1] }).catch(() => { });
                }

                const filter = (response) =>
                    response.content.startsWith(`**:moneybag: | ${interaction.user.username}, has transferred \`$${price}\``) &&
                    response.content.includes(`${bank}`) &&
                    response.author.id === probot &&
                    response.content.includes(Number(price));

                const collector = interaction.channel.createMessageCollector({
                    filter,
                    time: 120000,
                });

                collector.on("collect", async () => {
                    const check = checkdb.get(`${interaction.user.id}_${interaction.guild.id}`) || null;
                    if (msg.id === check) {
                        let userdata = await balanceSchema.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
                        if (userdata) {
                            userdata.balance += amount;
                        } else {
                            userdata = new balanceSchema({
                                userid: interaction.user.id,
                                guild: interaction.guild.id,
                                coins: amount,
                                balance: amount,
                                purchaseDate: Date.now()
                            });
                        }

                        userdata.save().then(() => {
                            checkdb.delete(`${interaction.user.id}_${interaction.guild.id}`);
                            const doneTrans = new EmbedBuilder()
                				.setColor(Colors.Main)
                                .setDescription(`تم إضافة **${amount}** عملة إلى رصيدك بنجاح!`);

                            msg.edit({ embeds: [doneTrans], components: [] });
                            interaction.channel.send(`<:signcheck:1293713968266874952> ${interaction.user} تم إضافة **${amount}** عملة إلى رصيدك!`);

                            let successEmbed = new EmbedBuilder()
                				.setColor(Colors.Main)
                                .setTitle(`عملية شراء`)
                                .setDescription(`تمت عملية الشراء بنجاح لـ \`${amount}\` بواسطة ${interaction.user}`);
                            if (ad) ad.edit({ embeds: [successEmbed] }).catch(() => { });
                        });
					Paymentsdb.push("VolvoPayments",{
					User: interaction.user.id,
					Bank: bank,
					Action: "Buy Coins",
					Admin: null,
					Credits: price,
					Coins: amount,
					Time: moment().format('YYYY-MM-DD HH:mm:ss'),
		})
                    } else {
                        let failedEmbed = new EmbedBuilder()
                            .setColor('#6A3CFF')
                            .setTitle(`عملية شراء`)
                            .setDescription(`المستخدم: ${interaction.user} حاول تنفيذ أمر شراء أكثر من مرة وتم رفض العملية.`);
                        if (ad) ad.edit({ embeds: [failedEmbed] }).catch(() => { });
                    }
                    collector.stop();
                });

                collector.on("end", (collected) => {
                    if (collected.size !== 0) return;

                    let timeoutEmbed = new EmbedBuilder()
                        .setColor('#6A3CFF')
                        .setTitle(`عملية شراء`)
                        .setDescription(`فشلت العملية لانتهاء المهلة بواسطة ${interaction.user}`);
                    if (ad) ad.edit({ embeds: [timeoutEmbed] }).catch(() => { });

                    checkdb.delete(`${interaction.user.id}_${interaction.guild.id}`);
                    const doneEmbed = new EmbedBuilder()
                        .setColor('#6A3CFF')
                        .setDescription(`${interaction.user}، انتهت مهلة الدفع. يمكنك المحاولة مرة أخرى إذا كنت لا تزال مهتماً.`);
                    if (msg) msg.edit({ embeds: [doneEmbed], components: [] });
                });

            });
        } catch (error) {
            console.error(error);
            await interaction.reply(` حدث خطأ أثناء تنفيذ الأمر. يرجى المحاولة مرة أخرى.`);
        }
    },
};
