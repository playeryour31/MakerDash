const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));

const OnlineTokens = new Database("./Database/Others/Tokens.json");
const OfflineTokens = new Database("./Database/Others/UnusedTokens.json");
const ExpireTokens = new Database("./Database/Others/ExpTokens.json");
const ErorrTokens = new Database("./Database/Tokens/ErrTokens.json");
const BotMakerTokens = new Database("./Database/Others/BotMakerTokens.json");

module.exports = {
  name: "stock",
  usage: "[prefix]stock",
  aliases: ["stuck", "s"],
  botP: [],
  userP: [],
  ownerOnly: true,
  run: async (client, message, args) => {
    try {
      const SubsTokens = await BotMakerTokens.get("Subscriptions") || [];
      const onlineTokens = await OnlineTokens.get("Bots") || [];
      const offlineTokens = await OfflineTokens.get("Tokens") || await OfflineTokens.get("TOKENS") || [];
      const expireTokens = await ExpireTokens.get("TOKENS") || [];
      const errorTokens = await ErorrTokens.get("TOKENS") || [];
      const SubsCount = SubsTokens.length || 0;
      const onlineCount = onlineTokens.length || 0;
      const offlineCount = offlineTokens.length || 0;
      const expireCount = expireTokens.length || 0;
      const errorCount = errorTokens.length || 0;
      const subBotsCount = onlineTokens.filter(bot => bot.Subs === true).length || 0;
	  const Volvo =  onlineCount - subBotsCount;
      const allTokens = [
        ...onlineTokens,
        ...offlineTokens,
        ...expireTokens,
        ...errorTokens,
 		...SubsTokens,
      ];

      const tokenCounts = {};
      let duplicateTokensCount = 0;
      allTokens.forEach(token => {
        tokenCounts[token] = (tokenCounts[token] || 0) + 1;
      });

      Object.values(tokenCounts).forEach(count => {
        if (count > 1) {
          duplicateTokensCount += count - 1;
        }
      });

      const embed = new EmbedBuilder()
        .setColor("#ffffff")
        .setDescription("## Token Stock Information")
        .addFields(
          { name: "Online Tokens", value: `${onlineCount}`, inline: true },
          { name: "Makers Tokens", value: `${SubsCount}`, inline: true },
          { name: "Offline Tokens", value: `${offlineCount}`, inline: true },
          { name: "Expired Tokens", value: `${expireCount}`, inline: true },
          { name: "Error Tokens", value: `${errorCount}`, inline: true },
          { name: "Total Tokens", value: `${allTokens.length}`, inline: true },
          { name: "Duplicate Tokens", value: `${duplicateTokensCount}`, inline: true },
          { name: "Bots Types", value: `In Volvo ${Volvo}, In Subs ${subBotsCount}`, inline: true }

        )
        .setTimestamp();

      message.reply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      message.reply("An error occurred while fetching the token stock.");
    }
  },
};
