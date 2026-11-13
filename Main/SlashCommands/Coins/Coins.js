const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");
const moment = require('moment-timezone');
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const Transfersdb = new Database("/Database/Payments/Transfers.json");
const Config = require('../../Resources/Config.json');
const Colors = require('../../Resources/Colors.json');
module.exports = {
  data: new SlashCommandBuilder()
    .setName("coins")
    .setDescription("Shows your balance, someone else's balance, or transfer coins.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user you want to check or transfer coins to.")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount of coins to transfer.")
        .setRequired(false)
    ),
  ownerOnly: false,

 async run(client, interaction) {
    try {
      const userCoins = require("../../../Schema/Balance");
      const targetUser = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");
      const sender = interaction.user;

      if (!targetUser && !amount) {
        const userBalance = await userCoins.findOne({
          userid: sender.id,
          guild: interaction.guild.id,
        });
        const coins = userBalance?.balance || 0;

        const embed = new EmbedBuilder()
          .setColor(Colors.Main)
          .setDescription(
            `<:Wallet:1393248405719093369> لديك **__${coins}__** عملة في رصيدك.`
          );

        return interaction.reply({ embeds: [embed] });
      }

      if (targetUser && !amount) {
        const userBalance = await userCoins.findOne({
          userid: targetUser.id,
          guild: interaction.guild.id,
        });
        const coins = userBalance?.balance || 0;

        const embed = new EmbedBuilder()
          .setColor(Colors.Main)
          .setDescription(
            `<:Wallet:1393248405719093369> **${targetUser.tag}** لديه **__${coins}__** عملة في رصيده.`
          );

        return interaction.reply({ embeds: [embed] });
      }

      if (targetUser && amount) {
        if (targetUser.id === sender.id) {
          return interaction.reply({
            content: "لا يمكنك تحويل العملات إلى نفسك!",
            ephemeral: true,
          });
        }

        if (amount <= 0) {
          return interaction.reply({
            content: "يجب أن تكون الكمية أكبر من صفر!",
            ephemeral: true,
          });
        }

        const senderBalance = await userCoins.findOne({
          userid: sender.id,
          guild: interaction.guild.id,
        });
        const senderCoins = senderBalance?.balance || 0;

        if (senderCoins < amount) {
          return interaction.reply({
            content: "لا تمتلك ما يكفي من العملات لإجراء هذا التحويل!",
            ephemeral: true,
          });
        }

        await userCoins.findOneAndUpdate(
          { userid: sender.id, guild: interaction.guild.id },
          { $inc: { balance: -amount } },
          { upsert: true }
        );

        await userCoins.findOneAndUpdate(
          { userid: targetUser.id, guild: interaction.guild.id },
          { $inc: { balance: amount } },
          { upsert: true }
        );
await targetUser.send({
  embeds: [
    new EmbedBuilder()
      .setColor(Colors.Main)
      .setDescription(`**تحويلات الخدمة**\n-# **تم تحويل مبلغ وقدره ${amount} إليك بواسطة ${sender.tag} (${sender.id})**\n-# يرجى التأكد من استلام المبلغ. شكرًا لاستخدامك الخدمة!`)
  ],
  components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('disabled_button')
        .setLabel('شكراً للتعامل مع فــولـفــو')
        .setStyle(ButtonStyle.Secondary) 
        .setDisabled(true)
    )
  ]
}).catch(() => {});

        const embed = new EmbedBuilder()
          .setColor(Colors.Main)
          .setDescription(
            `<:Wallet:1393248405719093369> تم تحويل **${amount} عملة** بنجاح إلى **${targetUser.tag}**!`
          );
					Transfersdb.push("VolvoTransfers",{
					User: interaction.user.id,
					To: targetUser.id,
					Action: "Transfer Coins",
					Coins: amount,
					Time: moment().format('YYYY-MM-DD HH:mm:ss'),
		})
        return interaction.reply({ embeds: [embed] });



      }

      return interaction.reply({
        content: "استخدام غير صالح للأمر. يرجى التحقق من الخيارات المدخل.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error executing coins command:", error);
      const errorMsg =
        "**حدث خطأ أثناء معالجة طلبك.** يرجى المحاولة لاحقًا.";

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: errorMsg, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
    }
  },
};