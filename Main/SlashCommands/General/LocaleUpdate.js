const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder } = require("@discordjs/builders");
const botsdb = new Database("/Database/Others/Tokens.json");
const commandsdb = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Commands.json'));
const rundb = new Database("./Database/BotMaker/RunBots.json");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("locale")
    .setDescription("Update all bot configurations")
    .addSubcommand(subcommand =>
      subcommand
        .setName("update")
    	.setDescription("Update all bot configurations")
    ),

  ownerOnly: true,
  async run(client, interaction) {
     try {
         const bots = botsdb.get("Bots") || [];
      if (bots.length === 0) return interaction.reply({ content: "No bots found!" });

      const msg = await interaction.reply({ content: `Updating ${bots.length} bots...` });

      let index = 0;
      const delay = 500;

      const updateNextBot = async () => {
        if (index >= bots.length) {
          return msg.edit({ content: "✅ Done updating all bots!" });
        }

        const bot = bots[index];
        index++;

        await rundb.set(bot.ClientID, true);
        const type = bot.Type || null;
        if (!type) return updateNextBot();

        const botCommandsDb = new Database(`/Database/CommandsData/BotsCommands_${bot.ClientID}.json`);
        let commandsArr = [];

        const configCommands = commandsdb.get("config");
        if (configCommands) {
          commandsArr.push(...configCommands);
        }

        if (commandsdb.get(type)) {
          commandsdb.get(type).forEach((comID) => {
            const com = commandsdb.get(comID);
            if (com) commandsArr.push(com);
          });
        }

        await botCommandsDb.set(`commands_${bot.ClientID}`, commandsArr);
        setTimeout(updateNextBot, delay);
      };

      updateNextBot(); 
    } catch (error) {
      console.error(error);
    }
  },
};