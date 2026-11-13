const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "slowmode",
    type: "System",
    botP: [PermissionFlagsBits.ManageChannels],
    userP: [PermissionFlagsBits.ManageChannels],
    P: "ManageChannels",
    ownerOnly: false,

    async run(client, message, args, language, reply, replyEmbeds, name) {
        try {
            const timeInput = args[0];
            const channel = message.channel;

            if (!timeInput) {
                return message.reply({ content: reply.System.Slowmode2, allowedMentions: { repliedUser: false } });
            }

            if (timeInput.toLowerCase() === 'off') {
                await channel.setRateLimitPerUser(0);
                return message.reply({ content: reply.System.Slowmode1.replace("[Channel]", channel), allowedMentions: { repliedUser: false } });
            }

            const timeMap = { s: 1, m: 60, h: 3600 };
            const match = timeInput.match(/(\d+)(s|m|h)/);
            if (!match) {
                return message.reply({ content: reply.System.Slowmode2, allowedMentions: { repliedUser: false } });
            }

            const [, value, unit] = match;
            const slowmodeDuration = parseInt(value) * timeMap[unit];
            if (slowmodeDuration > 21600) {
                return message.reply({ content: reply.System.Slowmode3, allowedMentions: { repliedUser: false } });
            }

            await channel.setRateLimitPerUser(slowmodeDuration);
            message.reply({ 
                content: reply.System.Slowmode4
                    .replace("[Time]", timeInput)
                    .replace("[Channel]", channel), 
                allowedMentions: { repliedUser: false } 
            });
        } catch (error) {
            console.log(error);
            return message.reply({ embeds: [replyEmbeds.errorEmbed], allowedMentions: { repliedUser: false } });
        }
    },
};
