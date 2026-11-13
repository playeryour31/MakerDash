const {
  Collection,
  WebhookClient,
  PermissionsBitField,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder 
} = require("discord.js");

const { SlashCommandBuilder } = require("@discordjs/builders");
const bots = require("../../Resources/Bots.json");
const Colors = require("../../Resources/Colors.json");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("subscriptions")
    .setDescription("Purchase Bots Panel")
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('Access the Purchase Subscriptions Panel')
        .addChannelOption(option => option.setName('channel').setDescription('The Channel'))
    ),

  ownerOnly: true,
  async run(client, interaction) {
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    let embed = new EmbedBuilder()
     .setDescription(`## Subscriptions Panel
**Subscription Features | مميزات الاشتراك:**  
-# - **Sell using Coins:** You can sell bots using the in-server currency (coins).  
-# - **Access to All Available Bots:** You can sell any bot available in the system.  
-# - **Token Provided by Us:** No need to bring your own token; we provide it for you.  
-# - **Weekly Top Commands:** Track the top users weekly with leaderboard commands.  
-# - **Advanced Logging System:** A fully detailed log system to monitor all activities.  
-# - **Custom Dashboard:** A dashboard similar to the one we use, giving you full control.  
-# - **Full Control Over Your Bot:** You have complete permissions to manage and use the bot as you wish.  
-# - **Customize Your Bot:** You can change the bot's name and profile picture.  
-# - **Modify Pricing & Features:** You can set the price of coins, bots, and additional features through the control panel.  
-# - **No Restrictions on Rights:** You retain 100% of your rights, with no commissions or limitations.
-# - **Full Administrative Commands:** Gain access to advanced admin commands.  
-# - **Custom Blacklist System:** Create and manage your own blacklist system for your maker bot.

-# - **البيع باستخدام الكوينز:** يمكنك بيع البوتات باستخدام عملة السيرفر (كوينز).  
-# - **الوصول إلى جميع البوتات المتوفرة:** يمكنك بيع أي بوت متاح في النظام.  
-# - **التوكن مقدم من قبلنا:** لا تحتاج إلى إحضار التوكن الخاص بك؛ نحن نوفره لك.  
-# - **أوامر التوب الأسبوعي:** تتبع أفضل المستخدمين أسبوعيًا عبر أوامر التوب.  
-# - **نظام لوق احترافي:** نظام سجل متكامل يشمل كل تغير يحصل لمراقبة جميع الأنشطة.  
-# - **لوحة تحكم مخصصة:** لوحة تحكم مشابهة للتي نستخدمها، تمنحك تحكمًا كاملًا.  
-# - **صلاحيات كاملة على البوت الخاص بك:** لديك كامل الصلاحيات لإدارة واستخدام البوت كما تشاء.  
-# - **تخصيص البوت:** يمكنك تغيير اسم وصورة البوت الخاص بك.  
-# - **إمكانية تعديل الأسعار والمميزات:** يمكنك تحديد أسعار الكوينز والبوتات والإضافات عبر لوحة التحكم.  
-# - **بدون تدخل في الحقوق:** تحصل على 100% من حقوقك، بدون أي عمولات أو قيود. 
-# - **صلاحيات إدارية كاملة:** الوصول إلى أوامر الإدارة المتقدمة.  
-# - **نظام بلاك ليست خاص:** يمكنك إنشاء وإدارة نظام الحظر الخاص بك للبوتات.
`)
      .setColor(Colors.Main);


    const infoButton = new ButtonBuilder()
      .setCustomId("buy")
      .setLabel("Buy Subscriptions")
      .setStyle(ButtonStyle.Secondary);

    const actionRow = new ActionRowBuilder().addComponents(infoButton);

    await channel.send({ embeds: [embed], components: [actionRow] });

    await interaction.reply({ content: `Done sending the panel.`, ephemeral: true });
  },
};
