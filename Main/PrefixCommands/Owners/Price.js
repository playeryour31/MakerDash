const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb')); 
const bots = require("../../Resources/Bots.json");
const botPrices = new Database("/Database/BotMaker/Prices.json");
const BotMakerDB = new Database("/Database/BotMaker/Data.json");
module.exports = {
  name: "price", 
  description: "Calculates the price for a given bot type or coins.",
  usage: "[prefix]price [type/coin/bot] [amount]",
  botP: [],
  userP: [],
  ownerOnly: true,
  run: async (client, message, args) => {
    try {
 const messageContent = message.content.trim(); 
const parts = messageContent.split(' ');

const type = parts[1].toLowerCase();
let amount = parseInt(parts[2]);
      if (!amount || isNaN(amount)) {
        amount = 1;
      }

      if (!type) {
        return message.reply("Please provide a valid type (coin or bot). For example: `$price AutoLine 200`");
      }

      if (type === "coin" || type === "c") {
        const coinPrice = await BotMakerDB.get(`CoinsP_${message.guild.id}`);
        if (!coinPrice) {
          return message.reply("Price for coins is not set in the database.");
        }
        const totalPrice = coinPrice * amount;
        return message.reply(`The price for ${amount} coins is: **${totalPrice}**`);
      }
              const typeShortcuts = {
        "broad": "broadcast",
        "feeds": "feedback",
        "pack": "package",
        "pro": "protection",
        "sug": "suggestion",
      };
      const fullType = typeShortcuts[type] || type;
      const botOptions = Object.values(bots).filter(bot => bot.type); 
      const bot = botOptions.find(bot => bot.type.toLowerCase() === fullType); 
  if (bot) {

        const price = await botPrices.get(`${bot.priceKey}_${message.guild.id}`);
        if (!price) {
          return message.reply("Price for the specified bot type is not set in the database.");
        }
        const totalPrice = price * amount;
        return message.reply(`The price for ${amount} of ${bot.type} bots is: **${totalPrice}**`);
      }

      return message.reply("Invalid type. Please provide a valid bot type or 'coin' for coins.");
      
    } catch (error) {
      console.error(error);
      message.reply("An error occurred while calculating the price.");
    }
  },
};
