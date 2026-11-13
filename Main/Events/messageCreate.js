const { EmbedBuilder, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const config = require('../Resources/Config.json');

module.exports.run = async (client, message) => {
    try {
        if (message.author.bot || !message.guild) return;
    if (message.content.match(new RegExp(`^<@!?${message.client.user.id}>`))) {
      return message.reply({content: `**اهلا انا صانع البوتات البادئة الخاصه بي هي [ ${config.BotPrefix} ]**`});
    }


        const args = message.content.slice().trim().split(/ +/g);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName || !commandName.startsWith(config.BotPrefix)) return;
        const cmdNameWithoutPrefix = commandName.slice(config.BotPrefix.length);
        let command = 
            client.commands.get(cmdNameWithoutPrefix) ||
            client.commands.find(
                (cmd) => cmd.aliases && cmd.aliases.includes(cmdNameWithoutPrefix)
            );

        if (!command) {
            console.log("Command not found.");
            return;
        }

        if (!config.Owner.includes(message.author.id)) {
            if (command?.userP?.length) {
                for (const perm of command.userP) {
                    if (!message?.member?.permissions.has(perm)) {
                        return;
                    }
                }
            }

            if (command.ownerOnly) {
                if (!config.Owner.includes(message.author.id)) {
                    return;
                }
            }
        }

        if (command?.botP?.length) {
            for (const perm of command.botP) {
                const bot = message.guild.members.me;
                if (!bot?.permissions.has(perm)) {
                    return message.reply(`I need the ${perm} permission to execute this command.`);
                }
            }
        }
        await command.run(client, message);
    } catch (err) {
        console.error("Failed to execute command:", err);
    }
};
