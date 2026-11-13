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

module.exports.run = async (client, role) => {
  try {
  const commandsdb = new Database(`/Database/CommandsData/BotsCommands_${client.user.id}.json`);
    const language = await Botlanguage.get(client.user?.id) || "En"
    const reply = await messages.get(language)
    let log = logdb.get("role-created_" + role.guild?.id + "_" + client.user.id) || null
  
    if(log){
      let guild = client.guilds.cache.get(role.guild.id)
          const color = guild.members.me.displayColor || log.color || "Green";

      if(!guild) return
      let logchannel = await role.guild.channels.cache.get(log.channel) || await role.guild.channels.fetch(log.channel).catch()
      if(!logchannel) return
      role.guild.fetchAuditLogs({ action: 30, limit: 1 }).then(async (audit) => {
        const info = audit.entries.first();
        let embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: role.guild.name, iconURL: role.guild.iconURL({ dynamic: true }) })
        .setFooter({ iconURL: info.executor.avatarURL({ dynamic: true }),text: info.executor.username})
        .setTimestamp()
        .setTitle(reply.Log.Reply6.replace("[ROLE]", role.name))
        .addFields(
          {name: reply.Log.Field1.name, value: reply.Log.Field1.value.replace("[AUTHOR]", info.executor), inline:true}
        )
        logchannel.send({embeds: [embed]})
      }).catch()
  
    }
  
  
    let botCommands = commandsdb.get('commands_' + client.user.id) || []
    const hasProtection = botCommands.some(command => command.type == "Protection");
    if(hasProtection){
      if (!isAntiNukeEnabled(role.guild?.id, client.user.id)) return
      role.guild.fetchAuditLogs({ action: 32, limit: 1 }).then(async (audit) => {
        const info = audit.entries.first();
        if (info.action == 32 && info.target?.id == role.user?.id && info.executor) {
          if (info.executor?.id == client.user?.id || info.executor?.id == role.guild.ownerId) return
          let limit = getActionLimit(role.guild?.id, client.user.id, "create_roles")
          let automode = getAutoMode(role.guild?.id, client.user.id, "create_roles")
          let whitelistCheck = isNukeWhitelisted(role.guild?.id, info.executor?.id, client.user.id, "create_roles")
          let logID = getProtectionLogId(role.guild?.id, client.user.id)
          if (whitelistCheck) {
            if(logID){
              let log = role.guild.channels.cache.get(logID)
              if(log){
                let embed = new EmbedBuilder()
                .setColor("Red")
                .setThumbnail(role.user.avatarURL({ dynamic: true }))
                .setAuthor({ name: role.user.username, iconURL: role.user.avatarURL({ dynamic: true }) })
                .setFooter({ iconURL: info.executor.avatarURL({ dynamic: true }), text: info.executor.username })
                .setTimestamp()
                .setDescription(reply.Protection.Reply12.replace("[ROLE]", role.name).replace("[AUTHOR]", info.executor).replace("[ACTION]", "created").replace("[TIMES]", reply.Protection.Whitelist.yes))
                log.send({embeds: [embed]})
              }
            }
          }else{
            let userData = bumpNukeCount(role.guild?.id, client.user.id, "create_roles", info.executor?.id)
            let timeLeft = limit - userData
    
            if(logID){
              let log = role.guild.channels.cache.get(logID)
              if(log){
                let embed = new EmbedBuilder()
                .setColor("Red")
                .setThumbnail(role.user.avatarURL({ dynamic: true }))
                .setAuthor({ name: role.user.username, iconURL: role.user.avatarURL({ dynamic: true }) })
                .setFooter({ iconURL: info.executor.avatarURL({ dynamic: true }), text: info.executor.username })
                .setTimestamp()
                .setDescription(reply.Protection.Reply12.replace("[ROLE]", role.name).replace("[AUTHOR]", info.executor).replace("[ACTION]", "created").replace("[TIMES]", timeLeft))
                log.send({embeds: [embed]})
              }
            }
            if(userData >= limit){
              let done = false
              if (automode === 'delete_roles') {
                const user = role.guild.members.cache.get(info.executor?.id)
                if (user) {
                  user.roles.cache.forEach(async r => {
                    await user.roles.remove(r).then(() =>{
                      done = true
                    }).catch(err => { })
                  })
                }
              } else if (automode == 'kick') {
                const user = role.guild.members.cache.get(info.executor?.id)
                user.kick().then(() =>{
                  done = true
                }).catch(err => { })
              }
              else if (automode == 'ban') {
                const user = role.guild.members.cache.get(info.executor?.id)
                user.ban().then(() =>{
                  done = true
                }).catch(err => { })
              }
              let serverOwner = role.guild.members.cache.get(role.guild.ownerId)
              setTimeout(() =>{
                if(serverOwner && done == true && shouldNotifyOwner(role.guild?.id, client.user.id)){
                  let embed = new EmbedBuilder()
                  .setColor("Green")
                  .setFooter({ text: reply.Others.Powered })
                  .setTimestamp()
                  .setDescription(reply.Protection.OwnerMSG.Desc.replace("[OWNER]", serverOwner))
                  .addFields(
                    {name: reply.Protection.OwnerMSG.Fileds.Field1.name , value: reply.Protection.OwnerMSG.Fileds.Field1.value.replace("[GUILDNAME]", role.guild.name)},
                    {name: reply.Protection.OwnerMSG.Fileds.Field2.name , value: reply.Protection.OwnerMSG.Fileds.Field2.value.replace("[USER_MENTION]", info.executor )},
                    {name: reply.Protection.OwnerMSG.Fileds.Field3.name , value: reply.Protection.OwnerMSG.Fileds.Field3.value.replace("[USER_ID]", info.executor?.id)},
                    {name: reply.Protection.OwnerMSG.Fileds.Field4.name , value: reply.Protection.OwnerMSG.Fileds.Field4.value.replace("[ACTION]", "Creating roles")},
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
