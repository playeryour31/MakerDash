const { Discord, EmbedBuilder } = require('discord.js')
const { Database } = require("st.db")
const config = require("../../Main/Resources/Config.json")
const messages = new Database("./Maker/Resources/LanguagsProvider.json");
const Botlanguage = new Database("/Database/Others/Language.json");
const db = require("../lib/featureDb")("sys_log");
module.exports.run = async (client, message, newMessage) => {
    try {
        const language = await Botlanguage.get(client.user?.id) || "En"
        const reply = await messages.get(language)
        let log = db.get("message-edited_" + message.guild?.id + "_" + client.user.id) || null
    
        if(!message.content && !newMessage.content || message.author?.id == client.user?.id) return
        if (log) {
            let guild = client.guilds.cache.get(message.guild.id)
            if(!guild) return
            let channel = await message.guild.channels.cache.get(log.channel) || await message.guild.channels.fetch(log.channel).catch()
            if (!channel) return
             const color = guild.members.me.displayColor || log.color || "Green";

            let embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ dynamic: true }) })
                .setFooter({ iconURL: message.author.avatarURL({ dynamic: true }), text: message.author.username })
                .setTimestamp()
                .setDescription(reply.Log.Reply11.replace("[AUTHOR]", message.author).replace("[CHANNEL]", message.channel).replace("[CONTENT]", message.content).replace("[NEW-CONTENT]", newMessage.content))
            channel.send({ embeds: [embed] })
        }
    } catch (error) {
        
    }
};
