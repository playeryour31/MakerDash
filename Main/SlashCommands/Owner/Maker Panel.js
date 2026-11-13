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
    .setName("maker")
    .setDescription("Purchase Bots Panel")
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('Access the Purchase Bots Panel')
        .addChannelOption(option => option.setName('channel').setDescription('The Channel'))
    ),

  ownerOnly: true,
  async run(client, interaction) {
    const channel = interaction.options.getChannel("channel") || interaction.channel;
  
    let embed = new EmbedBuilder()
     .setDescription(`## لوحه صانع البوتات
- **شراء بوت جاهز**: بوت يحتوي على أوامر محددة مسبقًا من الإدارة.
- **بناء بوت خاص بك**: حدد الأوامر التي تريدها وابدأ ببناء بوتك الخاص.
-# **يرجى الضغط على زر [ <:Info:1393620642833891479> ] قبل البدء.**`)
      .setColor(Colors.Main);
    const dropMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("buying-menu")
        .setPlaceholder("اختر خيار للبدء!")
        .addOptions([
        {
            label: 'شراء بوت جاهز',
            description: 'بوت يحتوي على أوامر محددة مسبقًا من الإدارة',
          value: 'buy',
          emoji: '<:Bots:1390163055178027101>',
        },
        {
            label: 'بناء بوت خاص بك',
            description: 'حدد الأوامر التي تريدها وابدأ ببناء بوتك الخاص',
          value: 'build',
          emoji: '<:Add:1390164628201406575>',
        }
      ]));

    const infoButton = new ButtonBuilder()
      .setCustomId("info")
      .setEmoji("<:Info:1393620642833891479>")
      .setStyle(ButtonStyle.Secondary);

    const actionRow = new ActionRowBuilder().addComponents(infoButton);

    await channel.send({ embeds: [embed], components: [dropMenu, actionRow] });

    await interaction.reply({ content: `Done sending the panel.`, ephemeral: true });
  },
};
