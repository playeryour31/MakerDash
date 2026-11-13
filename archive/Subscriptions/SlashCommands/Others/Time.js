const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { Database } = require("st.db");
let db3 = new Database("./Database/Others/BotMakerTokens.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("time")
    .setDescription("Find out the subscription duration."),
  botP: [PermissionFlagsBits.Administrator],
  P: "Administrator",
  ownerOnly: true,
  cooldown: 10000,

  async run(client, interaction, language, reply, embeds) {
    try {
      let data = db3.get("Subscriptions") || [];
      if (!data.length) {
        return interaction.reply({ 
          content: "There are no active subscriptions at the moment.", 
          ephemeral: true 
        });
      }

      const DB = data.filter(da => da.ClientID === client.user.id);
      if (!DB.length) {
        return interaction.reply({ 
          content: "No subscription found for this bot.", 
          ephemeral: true 
        });
      }

      const endTime = new Date(DB[0].endTime);
      const currentTime = new Date();
      const time = endTime - currentTime;

      if (time <= 0) {
        return interaction.reply({ 
          content: "Your subscription has expired.", 
          ephemeral: true 
        });
      }

      const daysLeft = Math.floor(time / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((time % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      interaction.reply({ 
        content: `**${daysLeft} days** and **${hoursLeft} hours**.`,
        allowedMentions: { repliedUser: false } 
      });

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
