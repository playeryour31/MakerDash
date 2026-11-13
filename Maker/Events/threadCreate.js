const { Discord, EmbedBuilder } = require('discord.js')
const { Database } = require("st.db")
const config = require("../../Main/Resources/Config.json")
const messages = new Database("./Maker/Resources/LanguagsProvider.json");
const Botlanguage = new Database("/Database/Others/Language.json");
const db = require("../lib/featureDb")("sys_log");
module.exports.run = async (client, channel) => {
  try {
    const language = await Botlanguage.get(client.user?.id) || "En"
    const reply = await messages.get(language)
    let log = db.get("thread-created_" + channel.guild?.id + "_" + client.user.id) || null
  
    if(log){
      let guild = client.guilds.cache.get(channel.guild.id)
      if(!guild) return
          const color = guild.members.me.displayColor || log.color || "Green";

      let logchannel = await channel.guild.channels.cache.get(log.channel) || await channel.guild.channels.fetch(log.channel).catch()
      if(!logchannel) return
      channel.guild.fetchAuditLogs({ action: 110, limit: 1 }).then(async (audit) => {
        const info = audit.entries.first();
        let embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: channel.guild.name, iconURL: channel.guild.iconURL({ dynamic: true }) })
        .setFooter({ iconURL: info.executor.avatarURL({ dynamic: true }),text: info.executor.username})
        .setTimestamp()
        .setTitle(reply.Log.Reply5.replace("[CHANNEL]", channel.name))
        .addFields(
          {name: reply.Log.Field1.name, value: reply.Log.Field1.value.replace("[AUTHOR]", info.executor), inline:true}
        )
        logchannel.send({embeds: [embed]})
      }).catch()
  
    }
  } catch (error) {
    
  }
};
