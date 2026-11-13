const {
  SlashCommandBuilder
} = require('@discordjs/builders');
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const Paymentsdb = new Database("/Database/Payments/Coins.json");
const moment = require('moment-timezone');
const Config = require('../../Resources/Config.json');
const Colors = require('../../Resources/Colors.json');
const {
  ensureBalance,
  clampBalance,
  MAX_BALANCE,
} = require('../../../src/shared/services/balanceService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit')
    .setDescription('Edit a user\'s balance')
    .addSubcommand(subcommand => 
      subcommand
        .setName('balance')
        .setDescription('Edit the balance of a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to edit the balance of')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action to perform on the balance')
            .setRequired(true)
            .addChoices(
              { name: 'Add Coins', value: 'add' },
              { name: 'Remove Coins', value: 'remove' },
              { name: 'Reset Balance', value: 'reset' }
            ))
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('The amount of coins to add/remove (if applicable)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(1_000_000_000_000)),
    ),
  ownerOnly: true,
async run(client, interaction) {
  try {
    const userOption = interaction.options.getUser('user');
    const action = interaction.options.getString('action');
    const amount = interaction.options.getInteger('amount') || 0;

    const balanceSchema = require('../../../Schema/Balance');
    let userdata = await ensureBalance(userOption.id, interaction.guild.id);

    if ((action === 'add' || action === 'remove') && amount <= 0) {
      return interaction.reply({
        content: '**خطأ**: أدخل مبلغاً أكبر من صفر.',
        ephemeral: true,
      });
    }

    let responseMessage = '';
    switch (action) {
      case 'add': {
        const next = clampBalance(userdata.balance + amount);
        if (next === userdata.balance && amount > 0 && userdata.balance >= MAX_BALANCE) {
          return interaction.reply({
            content: `**خطأ**: الرصيد وصل للحد الأقصى المسموح (${MAX_BALANCE}).`,
            ephemeral: true,
          });
        }
        userdata.balance = next;
        responseMessage = `تم زيادة رصيد **${userOption.username}** بمقدار **${amount}** عملات. الرصيد الآن: **${userdata.balance}**.`;
        break;
      }

      case 'remove':
        userdata.balance = clampBalance(userdata.balance - amount);
        responseMessage = `تم تقليل رصيد **${userOption.username}** بمقدار **${amount}** عملات. الرصيد الآن: **${userdata.balance}**.`;
        break;

      case 'reset':
        userdata.balance = 0;
        responseMessage = `تم إعادة تعيين رصيد **${userOption.username}** إلى **0** عملات.`;
        break;

      default:
        return interaction.reply({ content: 'تم اختيار إجراء غير صالح.' });
    }

    userdata.coins = userdata.balance;
    await balanceSchema.updateOne(
      { userid: userOption.id, guild: interaction.guild.id },
      { balance: userdata.balance, coins: userdata.coins },
      { upsert: true },
    );
					Paymentsdb.push("VolvoPayments",{
					User: userOption.id,
					Bank: null,
					Action: action,
					Admin: interaction.user.id,
					Coins: amount,
					Time: moment().format('YYYY-MM-DD HH:mm:ss'),
		})
    interaction.reply({
      content: responseMessage
    });

  } catch (error) {
    console.error(error);
    interaction.reply({ content: '**خطأ**: حدث خطأ أثناء معالجة طلبك. الرجاء المحاولة مرة أخرى لاحقًا.' });
  }
}
};
