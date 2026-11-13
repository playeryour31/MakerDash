const {
  Client,
  Collection,
  Discord,
  createInvite,
  ChannelType,
  WebhookClient,
  PermissionFlagsBits,
  GatewayIntentBits,
  Partials,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  Events,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  GatewayCloseCodes,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} = require("discord.js");
const moment = require('moment-timezone');
const ms = require("ms");

module.exports = {
  name: "ban",
  type: "System",
  botP: [PermissionFlagsBits.BanMembers],
  userP: [PermissionFlagsBits.BanMembers],
  P: "BanMembers",
  ownerOnly: false,
  run: async (client, message, args, language, reply, replyEmbeds, name) => {
    try {
      if (args.length < 1) {
        return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
      }

      let user = args[0];
      let time = args[1]
      if (!time) time = "90d"
      let banTime = "90d";
      let reason = "";


      let TimeCC = ms(time) / 1000;


      if (args[1]) {
        if (isNaN(TimeCC)) {
          reason += args.slice(1).join(" ")
        } else {
          banTime = args[1]
        }
      }
      const banTimeSec = ms(banTime) / 1000;

      const member = message.mentions.members.first() || message.guild.members.cache.get(user) || await client.users.fetch(user);
      if (!member && !user.match(/^\d+$/)) return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })

      if (member.id === message.member.id)
        return message
          .reply({
            content: reply.Others.Reply7.replace("[COMMAND]", "ban").replace("[AUTHOR]", message.author.username),
            ephemeral: true,
            allowedMentions: { repliedUser: false }
          })


      if (message.member.roles.highest.position <= member?.roles?.highest?.position)
        return message
          .reply({
            content: reply.Others.Reply7.replace("[COMMAND]", "ban").replace("[AUTHOR]", member.user.username),
            ephemeral: true,
          })

      if (user.match(/^\d+$/)) {
        try {
          const endTime = moment().add(banTimeSec, 'seconds').format('YYYY-MM-DD HH:mm:ss');
          await message.guild.members.ban(user, { reason: "By: " + message.author.username + "," + "REASON: " + reason + "ENDS ON:" + endTime });
          return message
            .reply({
              content: reply.System.Ban1.replace("[USER]", member?.user?.username ?? member?.username ?? "user"),
              allowedMentions: { repliedUser: false }
            })
        } catch (error) {
          console.log(error);
          return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
      } else {
        if (member.id === message.member.id)
          return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })


        if (
          message.member.roles.highest.position <=
          member.roles.highest.position
        )
          return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })


        if (!member.bannable)
          return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        try {
          await member.ban({ reason: "By: " + message.author.username + "," + "REASON: " + reason + "ENDS ON:" + endTime });
          return message
            .reply({
              content: reply.System.Ban1.replace("[USER]", member.user.username),
              allowedMentions: { repliedUser: false }
            })
        } catch (error) {
          console.log(error);
          return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
      }

    } catch (error) {
      console.log(error)
      return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
    }
  }
};