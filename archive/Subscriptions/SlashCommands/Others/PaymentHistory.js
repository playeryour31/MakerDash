const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { Database } = require("st.db");
const moment = require("moment");
let db3 = new Database("./Database/Others/BotMakerTokens.json");
const LogsDate = new Database("./Subscriptions/Database/Others/Logger");
const Tokens = new Database("./Database/Others/Tokens.json");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("payment")
    .setDescription("Manage payment records.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("history")
        .setDescription("View the payment history of the maker.")
    ),
  botP: [PermissionFlagsBits.Administrator],
  P: "Administrator",
  ownerOnly: true,
  cooldown: 10000,

  async run(client, interaction, language, reply, embeds) {
    try {
      const logger = LogsDate.get(`Logs_${client.user.id}_${interaction.guild.id}`) || [];
      let totalAmount = 0;
      let totalCredits = 0;
      const actions = ["Buy Coins", "Add Coins"];
      const relevantLogs = logger.filter(log => actions.includes(log.Action));
      const bots = Tokens.get("Bots") || [];
      const totalBotsSold = bots.filter(bot => bot.Seller === interaction.guild.id).length;

      relevantLogs.forEach(log => {
        totalAmount += log.Amount; 

        if (log.Action === "Buy Coins") {
          totalCredits += log.Credits || 0; 
        } else if (log.Action === "Add Coins") {
          totalCredits += log.Credits || 0;
        }
      });

      const formatCredits = (credits) => {
        if (credits >= 1000000000) return `${(credits / 1000000000).toFixed(1)}b`;
        if (credits >= 1000000) return `${(credits / 1000000).toFixed(1)}m`;
        if (credits >= 1000) return `${(credits / 1000).toFixed(1)}k`;
        return credits;
      };

      const formattedCredits = formatCredits(totalCredits);

      const embed = new EmbedBuilder()
        .setDescription(`## Payment History
> -# **Total Amount Transacted:** ${totalAmount} Coins
> -# **Total Credits:** ${formattedCredits}
> -# **Total Bots Sold:** ${totalBotsSold || 0}
        `)
        .setColor(interaction.guild.members.me.displayColor);

      return interaction.reply({ embeds: [embed], ephemeral: false });

    } catch (error) {
      console.error(error);
      return interaction.reply({
        embeds: [embeds.errorEmbed],
        ephemeral: true,
        allowedMentions: { repliedUser: false }
      });
    }
  },
};
