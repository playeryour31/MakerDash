const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "coins",
  description: "Shows your balance or someone else's balance.",
  usage: "[prefix]coins [@user]",
  aliases: ["c", "coin"],
  botP: [],
  userP: [],
  ownerOnly: false,
  run: async (client, message, args) => {
    try {
      let user = (args && args[0]) ? args[0] : message.author.id;

      const targetUser = message.mentions.members.first() 
        || message.guild.members.cache.get(user) 
        || await client.users.fetch(user) 
        || message.author;


      const balanceSchema = require("../../../Schema/Balance");

      const userData = await balanceSchema.findOne({
        userid: targetUser.id,
        guild: message.guild.id,
      });

      if (!userData) {
        return message.reply(`${targetUser.username} has no coins in their account.`);
      }

      let messageContent;

      if (targetUser.id === message.member.id) {
        messageContent = `You have **${userData.balance}** coins.`;
      } 
      else if (userData.balance === 0) {
        messageContent = `${targetUser.username} has no coins in their account.`;
      } 
      else {
        messageContent = `${targetUser.username} has **${userData.balance}** coins!`;
      }
        message.reply(messageContent);
    } catch (error) {
      console.error(error);
    }
  },
};
