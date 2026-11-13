const { Discord, EmbedBuilder } = require('discord.js')
const { Database } = require("st.db")
const config = require("../../Main/Resources/Config.json")
const messages = new Database("./Maker/Resources/LanguagsProvider.json");
const Botlanguage = new Database("/Database/Others/Language.json");
const logdb = require("../lib/featureDb")("sys_log");
const protectiondb = require("../lib/featureDb")("protection")
const {
  isAntiNukeEnabled,
  getActionLimit,
  getAutoMode,
  isNukeWhitelisted,
  getProtectionLogId,
  bumpNukeCount,
  shouldNotifyOwner,
} = require("../lib/protectionNuke")


const moment = require('moment-timezone');

module.exports.run = async (client, channel) => {
  try {
    const commandsdb = new Database(`/Database/CommandsData/BotsCommands_${client.user.id}.json`);
    const language = await Botlanguage.get(client.user?.id) || "En"
    const reply = await messages.get(language)
    let log = logdb.get("channel-deleted_" + channel.guild?.id + "_" + client.user.id) || null
  
    if(log){
      let guild = client.guilds.cache.get(channel.guild.id)
      const color = guild.members.me.displayColor || log.color || "Green";

      if(!guild) return
      let logchannel = await channel.guild.channels.cache.get(log.channel) || await channel.guild.channels.fetch(log.channel).catch()
      if(!logchannel) return
      channel.guild.fetchAuditLogs({ action: 12, limit: 1 }).then(async (audit) => {
        const info = audit.entries.first();
        let embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: channel.guild.name, iconURL: channel.guild.iconURL({ dynamic: true }) })
        .setFooter({ iconURL: info.executor.avatarURL({ dynamic: true }),text: info.executor.username})
        .setTimestamp()
        .setTitle(reply.Log.Reply7.replace("[CHANNEL]", channel.name))
        .addFields(
          {name: reply.Log.Field1.name, value: reply.Log.Field1.value.replace("[AUTHOR]", info.executor), inline:true}
        )
        logchannel.send({embeds: [embed]})
      }).catch()
  
    }
  
    let botCommands = commandsdb.get('commands_' + client.user.id) || []
    const hasProtection = botCommands.some(command => command.type == "Protection");
    if(hasProtection){
      if (!isAntiNukeEnabled(channel.guild?.id, client.user.id)) return
      channel.guild.fetchAuditLogs({ action: 12, limit: 1 }).then(async (audit) => {
        const info = audit.entries.first();
        if (info.action == 12 && info.target?.id == channel.id && info.executor) {
          if (info.executor?.id == client.user?.id || info.executor?.id == channel.guild.ownerId) return
          let limit = getActionLimit(channel.guild?.id, client.user.id, "delete_channel")
          let automode = getAutoMode(channel.guild?.id, client.user.id, "delete_channel")
          let whitelistCheck = isNukeWhitelisted(channel.guild?.id, info.executor?.id, client.user.id, "delete_channel")
          let logID = getProtectionLogId(channel.guild?.id, client.user.id)
          if (whitelistCheck) {
            if(logID){
              let log = channel.guild.channels.cache.get(logID)
              if(log){
                let embed = new EmbedBuilder()
                .setColor("Red")
                .setThumbnail(channel.user.avatarURL({ dynamic: true }))
                .setAuthor({ name: channel.user.username, iconURL: channel.user.avatarURL({ dynamic: true }) })
                .setFooter({ iconURL: info.executor.avatarURL({ dynamic: true }), text: info.executor.username })
                .setTimestamp()
                .setDescription(reply.Protection.Reply11.replace("[CHANNEL]", channel.name).replace("[ACTION]", "deleted").replace("[AUTHOR]", info.executor).replace("[TIMES]", reply.Protection.Whitelist.yes))
                log.send({embeds: [embed]})
              }
            }
          }else{
            let userData = bumpNukeCount(channel.guild?.id, client.user.id, "delete_channel", info.executor?.id)
            let timeLeft = limit - userData
    
            if(logID){
              let log = channel.guild.channels.cache.get(logID)
              if(log){
                let embed = new EmbedBuilder()
                .setColor("Red")
                .setThumbnail(channel.user.avatarURL({ dynamic: true }))
                .setAuthor({ name: channel.user.username, iconURL: channel.user.avatarURL({ dynamic: true }) })
                .setFooter({ iconURL: info.executor.avatarURL({ dynamic: true }), text: info.executor.username })
                .setTimestamp()
                .setDescription(reply.Protection.Reply11.replace("[CHANNEL]", channel.name).replace("[ACTION]", "deleted").replace("[AUTHOR]", info.executor).replace("[TIMES]", timeLeft))
                log.send({embeds: [embed]})
              }
            }
            if(userData >= limit){
              let done = false
              if (automode === 'delete_roles') {
                const user = channel.guild.members.cache.get(info.executor?.id)
                if (user) {
                  user.roles.cache.forEach(async r => {
                    await user.roles.remove(r).then(() =>{
                      done = true
                    }).catch(err => { })
                  })
                }
              } else if (automode == 'kick') {
                const user = channel.guild.members.cache.get(info.executor?.id)
                user.kick().then(() =>{
                  done = true
                }).catch(err => { })
              }
              else if (automode == 'ban') {
                const user = channel.guild.members.cache.get(info.executor?.id)
                user.ban().then(() =>{
                  done = true
                }).catch(err => { })
              }
              let serverOwner = channel.guild.members.cache.get(channel.guild.ownerId)
              setTimeout(() =>{
                if(serverOwner && done == true && shouldNotifyOwner(channel.guild?.id, client.user.id)){
                  let embed = new EmbedBuilder()
                  .setColor("Green")
                  .setFooter({ text: reply.Others.Powered })
                  .setTimestamp()
                  .setDescription(reply.Protection.OwnerMSG.Desc.replace("[OWNER]", serverOwner))
                  .addFields(
                    {name: reply.Protection.OwnerMSG.Fileds.Field1.name , value: reply.Protection.OwnerMSG.Fileds.Field1.value.replace("[GUILDNAME]", channel.guild.name)},
                    {name: reply.Protection.OwnerMSG.Fileds.Field2.name , value: reply.Protection.OwnerMSG.Fileds.Field2.value.replace("[USER_MENTION]", info.executor )},
                    {name: reply.Protection.OwnerMSG.Fileds.Field3.name , value: reply.Protection.OwnerMSG.Fileds.Field3.value.replace("[USER_ID]", info.executor?.id)},
                    {name: reply.Protection.OwnerMSG.Fileds.Field4.name , value: reply.Protection.OwnerMSG.Fileds.Field4.value.replace("[ACTION]", "Deleting channels")},
                  )
                  serverOwner.send({embeds: [embed]})
                }
              }, 1000)
            }
          }
        }
      }).catch()
    }
  } catch (error) {
    
  }

  try {
    const { handleChannelDelete } = require('../lib/protectionHardening');
    await handleChannelDelete(client, channel);
  } catch (_) {}

};
