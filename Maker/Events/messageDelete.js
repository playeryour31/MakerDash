const { Discord, EmbedBuilder } = require('discord.js')
const { Database } = require("st.db")
const config = require("../../Main/Resources/Config.json")
const messages = new Database("./Maker/Resources/LanguagsProvider.json");
const Botlanguage = new Database("/Database/Others/Language.json");
const db = require("../lib/featureDb")("sys_log");
module.exports.run = async (client, message, message2) => {
    try {
        const language = await Botlanguage.get(client.user?.id) || "En"
        const reply = await messages.get(language)
        let log = db.get("message-deleted_" + message.guild?.id + "_" + client.user.id) || null
    
    
        if (log) {
            let guild = client.guilds.cache.get(message.guild.id)
          const color = guild.members.me.displayColor || log.color || "Green";

            if(!guild) return
            if (message?.author?.id == client.user?.id || !message.author) return
            let channel = await message.guild.channels.cache.get(log.channel) || await message.guild.channels.fetch(log.channel).catch()
            if (!channel) return
            let embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: message?.author?.username, iconURL: message.author.avatarURL({ dynamic: true }) })
                .setFooter({ iconURL: message?.author.avatarURL({ dynamic: true }), text: message?.author.username })
                .setTimestamp()
                .setDescription(reply.Log.Reply9.replace("[AUTHOR]", message?.author).replace("[CHANNEL]", message?.channel).replace("[CONTENT]", message.content))
            channel.send({ embeds: [embed] })
        }
    } catch (error) {
        
    }
};
