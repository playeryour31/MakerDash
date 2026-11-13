const { 
    Client, 
    Collection, 
    PermissionFlagsBits, 
    Message, 
    EmbedBuilder 
} = require("discord.js");

module.exports = {
    name: "say",
    type: "System",
    botP: [],
    userP: [PermissionFlagsBits.ManageMessages],
    P: "ManageMessages",
    ownerOnly: false,
    /**
    * @param {Message} message
    */
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            if (!args.length) 
                return message.reply({ content: reply.System.Say1, allowedMentions: { repliedUser: false } });

            let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[args.length - 1]);

            if (channel) args.pop();
            else channel = message.channel; 

            
            const msg = args.join(' '); 

            
            if (!msg) 
                return message.reply({ content: reply.System.Say1, allowedMentions: { repliedUser: false } });

            let image = message.attachments.first();

            if (image) {
                channel.send({ content: msg, files: [image.proxyURL] })
                    .then(() => message.react('✔').catch())
                    .catch(async (error) => { message.react('❌').catch(); console.log(error.message) });
            } else {
                channel.send(msg)
                    .then(() => message.react('✔').catch())
                    .catch(async (error) => { message.react('❌').catch(); console.log(error.message) });
            }

        } catch (error) {
            console.log(error);
            return message.reply({
                embeds: [replyEmbeds.notFoundEmbed],
                allowedMentions: { repliedUser: false }
            });
        }
    }
};
