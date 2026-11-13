const { EmbedBuilder } = require('discord.js')
const { Database } = require("st.db")
const UserData = require("../lib/featureDb")("sys_userdata");
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
    if(member.user.id == client.user.id) return
    try {
      const guildStats = require('../../src/shared/services/guildStats');
      guildStats.increment(
        client.user?.id,
        member?.guild?.id,
        'leaves',
        member?.guild?.memberCount,
      );
    } catch (_) {}
    //kick log
    member?.guild?.fetchAuditLogs({ action: 20, limit: 1 }).then(async (audit) => {
      let log = logdb.get("member-kicked_" + member.guild?.id + "_" + client.user.id) || null
      if (!log) return
      let channel = await member?.guild?.channels.cache.get(log.channel) || await member?.guild?.channels.fetch(log.channel).catch()
      if (!channel) return
      const info = audit.entries.first();
      if (info.action == 20 && info.target?.id === member.user?.id){
	 let gg = client.guilds.cache.get(channel.guild.id)
      const color = gg.members.me.displayColor || log.color || "Green";

      let embed = new EmbedBuilder()
        .setColor(color)
        .setThumbnail(member.user.avatarURL({ dynamic: true }))
        .setAuthor({ name: member.user.username, iconURL: member.user.avatarURL({ dynamic: true }) })
        .setFooter({ iconURL: info.executor.avatarURL({ dynamic: true }), text: info.executor.username })
        .setTimestamp()
        .setDescription(reply.Log.Reply12.replace("[USER]", member.user))
        .addFields(
          { name: reply.Log.Field1.name, value: reply.Log.Field1.value.replace("[AUTHOR]", info.executor), inline: true }
        )
      if (info.reason) {
        embed.addFields(
          { name: reply.Log.Field2.name, value: reply.Log.Field2.value.replace("[REASON]", info.reason), inline: true }
        )
      }
      channel.send({ embeds: [embed] })
      }else if(info.action == 22){
  
      }else{
        let log = logdb.get("member-left_" + member.guild?.id + "_" + client.user.id) || null
        if (!log) return
        let channel = await member?.guild?.channels.cache.get(log.channel) || await member?.guild?.channels.fetch(log.channel).catch()
        if (!channel) return
        let gg = client.guilds.cache.get(channel.guild.id)
        const color = gg?.members?.me?.displayColor || log.color || "Green";
        let embed = new EmbedBuilder()
        .setColor(color)
        .setThumbnail(member.user.avatarURL({ dynamic: true }))
        .setAuthor({ name: member.user.username, iconURL: member.user.avatarURL({ dynamic: true }) })
        .setFooter({ iconURL: member?.guild?.iconURL({ dynamic: true }), text: member?.guild?.name })
        .setTimestamp()
        .setDescription(reply.Log.Reply15.replace("[USER]", member.user))
        channel.send({ embeds: [embed] })
      }
    }).catch()
  
  
    let botCommands = commandsdb.get('commands_' + client.user.id) || []
    const hasProtection = botCommands.some(command => command.type == "Protection");
    if(hasProtection){
      if (!isAntiNukeEnabled(member.guild?.id, client.user.id)) return
      member?.guild?.fetchAuditLogs({ action: 20, limit: 1 }).then(async (audit) => {
        const info = audit.entries.first();
        if (info.action == 20 && info.target?.id == member.user?.id && info.executor) {
          if (info.executor?.id == client.user?.id || info.executor?.id == member?.guild?.ownerId) return
          let limit = getActionLimit(member.guild?.id, client.user.id, "kick")
          let automode = getAutoMode(member.guild?.id, client.user.id, "kick")
          let whitelistCheck = isNukeWhitelisted(member.guild?.id, info.executor?.id, client.user.id, "kick")
          let logID = getProtectionLogId(member.guild?.id, client.user.id)
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
                .setDescription(reply.Protection.Reply10.replace("[USER]", member.user).replace("[AUTHOR]", info.executor).replace("[ACTION]", "kicked").replace("[TIMES]", reply.Protection.Whitelist.yes))
                log.send({embeds: [embed]})
              }
            }
          }else{
            let userData = bumpNukeCount(member.guild?.id, client.user.id, "kick", info.executor?.id)
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
                .setDescription(reply.Protection.Reply10.replace("[USER]", member.user).replace("[AUTHOR]", info.executor).replace("[ACTION]", "kicked").replace("[TIMES]", timeLeft))
                log.send({embeds: [embed]})
              }
            }
            if(userData >= limit){
              let done = false
              if (automode == 'delete_roles') {
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
                    {name: reply.Protection.OwnerMSG.Fileds.Field4.name , value: reply.Protection.OwnerMSG.Fileds.Field4.value.replace("[ACTION]", "Kicking members")},
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
    const { handleMemberRemove } = require('../lib/protectionHardening');
    await handleMemberRemove(client, member);
  } catch (_) {}

};
