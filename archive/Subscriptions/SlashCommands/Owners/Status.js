const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActivityType
} = require("discord.js");
const bots = require("../../../Main/Resources/Bots.json");
const { Database } = require("st.db");
const Status = new Database('./Subscriptions/Database/Others/ConfigStatus');
const botOptions = Object.values(bots)
  .filter(bot => bot.type)
  .map(bot => ({
    name: 'Buy ' + bot.type,
    value: bot.type
  }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Manage your bot purchases status')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Select the type of purchase')
        .setRequired(true)
        .addChoices(
          { name: 'Buy All Bot', value: 'Bot' },
          { name: 'Buy Coins', value: 'Coins' },
          ...botOptions
        )
    )
    .addStringOption(option =>
      option
        .setName('status')
        .setDescription('Select the status to update')
        .setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' }
        )
    ),
    botP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: true,
    cooldown: 20000,
    async run(client, interaction, language, reply, embeds) {
    try {
      const type = interaction.options.getString('type');
      const status = interaction.options.getString('status');

      await Status.set(`${client.user.id}_${interaction.guild.id}_${type}`, status === 'on' ? "On" : "Off");

      let responseMessage = '';
      switch (type) {
        case 'Coins':
          responseMessage = `You have selected to change the status for buying coins. The status has been **${status === 'on' ? 'enabled' : 'disabled'}**.`;
          break;
        case 'Bot':
          responseMessage = `You have selected to change the status for buying bots. The status has been **${status === 'on' ? 'enabled' : 'disabled'}**.`;
          break;
        case 'Redeem':
          responseMessage = `You have selected to change the status for redeeming. The status has been **${status === 'on' ? 'enabled' : 'disabled'}**.`;
          break;
        default:
          responseMessage = `You have selected the status update for **${type}**. The status has been **${status === 'on' ? 'enabled' : 'disabled'}**.`;
          break;
      }

      return interaction.reply({
        content: responseMessage,
        ephemeral: true
      });

     } catch (error) {
            console.log(error)
            return interaction.editReply({ embeds: [embeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};