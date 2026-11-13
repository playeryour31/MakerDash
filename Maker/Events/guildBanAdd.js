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

module.exports.run = async (client, member) => {
  try {
  const commandsdb = new Database(`/Database/CommandsData/BotsCommands_${client.user.id}.json`);
    const language = await Botlanguage.get(client.user?.id) || "En"
    const reply = await messages.get(language)
    let logData = logdb.get("member-banned_" + member.guild?.id + "_" + client.user.id) || null
    if(member.user.id == client.user.id) return
    if (logData) {
      let guild = client.guilds.cache.get(member?.guild?.id)
      const color = guild.members.me.displayColor || logData.color || "Green";
      if(!guild) return
      let channel = await member?.guild?.channels.cache.get(logData.channel) || await member?.guild?.channels.fetch(logData.channel).catch()
      if (!channel) return
      member?.guild?.fetchAuditLogs({ action: 22, limit: 1 }).then(async (audit) => {
        const info = audit.entries.first();
        let embed = new EmbedBuilder()
          .setColor(color)
          .setThumbnail(member.user.avatarURL({ dynamic: true }))
          .setAuthor({ name: member.user.username, iconURL: member.user.avatarURL({ dynamic: true }) })
          .setFooter({ iconURL: info.executor.avatarURL({ dynamic: true }), text: info.executor.username })
          .setTimestamp()
          .setDescription(reply.Log.Reply1.replace("[USER]", member.user))
          .addFields(
            { name: reply.Log.Field1.name, value: reply.Log.Field1.value.replace("[AUTHOR]", info.executor), inline: true }
          )
        if (info.reason) {
          embed.addFields(
            { name: reply.Log.Field2.name, value: reply.Log.Field2.value.replace("[REASON]", info.reason), inline: true }
          )
        }
        channel.send({ embeds: [embed] })
      }).catch()
    }
  
    let botCommands = commandsdb.get('commands_' + client.user.id) || []
    const hasProtection = botCommands.some(command => command.type == "Protection");
    if(hasProtection){
      if (!isAntiNukeEnabled(member.guild?.id, client.user.id)) return
      member?.guild?.fetchAuditLogs({ action: 22, limit: 1 }).then(async (audit) => {
        const info = audit.entries.first();
        if (info.targetType == 'User' && info.actionType == 'Delete' && info.executor && info.target?.id == member.user?.id) {
          if (info.executor?.id == client.user?.id || info.executor?.id == member?.guild?.ownerId) return
          const guildId = member.guild?.id
          const botId = client.user.id
          let limit = getActionLimit(guildId, botId, "ban")
          let automode = getAutoMode(guildId, botId, "ban")
          let whitelistCheck = isNukeWhitelisted(guildId, info.executor?.id, botId, "ban")
          let logID = getProtectionLogId(guildId, botId)
          if (whitelistCheck) {
            if(logID){
              let log = member?.guild?.channels.cache.get(logID)
              if(log){
                let embed = new EmbedBuilder()
                .setColor("Red")
                .setThumbnail(member.user.avatarURL({ dynamic: true }))
                .setAuthor({ name: member.user.username, iconURL: member.user.avatarURL({ dynamic: true }) })
                .setFooter({ iconURL: info.executor.avatarURL({ dynamic: true }), text: info.executor.username })
                .setTimestamp()
                .setDescription(reply.Protection.Reply10.replace("[USER]", member.user).replace("[AUTHOR]", info.executor).replace("[ACTION]", "banned").replace("[TIMES]", reply.Protection.Whitelist.yes))
                log.send({embeds: [embed]})
              }
            }
          }else{
            let userData = bumpNukeCount(guildId, botId, "ban", info.executor?.id)
            let timeLeft = limit - userData
    
            if(logID){
              let log = member?.guild?.channels.cache.get(logID)
              if(log){
                let embed = new EmbedBuilder()
                .setColor("Red")
                .setThumbnail(member.user.avatarURL({ dynamic: true }))
                .setAuthor({ name: member.user.username, iconURL: member.user.avatarURL({ dynamic: true }) })
                .setFooter({ iconURL: info.executor.avatarURL({ dynamic: true }), text: info.executor.username })
                .setTimestamp()
                .setDescription(reply.Protection.Reply10.replace("[USER]", member.user).replace("[AUTHOR]", info.executor).replace("[ACTION]", "banned").replace("[TIMES]", timeLeft))
                log.send({embeds: [embed]})
              }
            }
            if(userData >= limit){
              let done = false
              if (automode === 'delete_roles') {
                const user = member?.guild?.members.cache.get(info.executor?.id)
                if (user) {
                  user.roles.cache.forEach(async r => {
                    await user.roles.remove(r).then(() =>{
                      done = true
                    }).catch(err => { })
                  })
                }
              } else if (automode == 'kick') {
                const user = member?.guild?.members.cache.get(info.executor?.id)
                user.kick().then(() =>{
                  done = true
                }).catch(err => { })
              }
              else if (automode == 'ban') {
                const user = member?.guild?.members.cache.get(info.executor?.id)
                user.ban().then(() =>{
                  done = true
                }).catch(err => { })
              }
              let serverOwner = member?.guild?.members.cache.get(member?.guild?.ownerId)
              setTimeout(() =>{
                if(serverOwner && done == true && shouldNotifyOwner(member.guild?.id, client.user.id)){
                  let embed = new EmbedBuilder()
                  .setColor("Green")
                  .setFooter({ text: reply.Others.Powered })
                  .setTimestamp()
                  .setDescription(reply.Protection.OwnerMSG.Desc.replace("[OWNER]", serverOwner))
                  .addFields(
                    {name: reply.Protection.OwnerMSG.Fileds.Field1.name , value: reply.Protection.OwnerMSG.Fileds.Field1.value.replace("[GUILDNAME]", member?.guild?.name)},
                    {name: reply.Protection.OwnerMSG.Fileds.Field2.name , value: reply.Protection.OwnerMSG.Fileds.Field2.value.replace("[USER_MENTION]", info.executor )},
                    {name: reply.Protection.OwnerMSG.Fileds.Field3.name , value: reply.Protection.OwnerMSG.Fileds.Field3.value.replace("[USER_ID]", info.executor?.id)},
                    {name: reply.Protection.OwnerMSG.Fileds.Field4.name , value: reply.Protection.OwnerMSG.Fileds.Field4.value.replace("[ACTION]", "Banning members")},
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
  
};
