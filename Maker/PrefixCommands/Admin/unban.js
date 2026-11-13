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
  
  module.exports = {
    name: "unban",
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
        const userId = user.replace(/[^0-9]/g, "");
        const bannedUsers = await message.guild.bans.fetch();
        const bannedUser = bannedUsers.find((u) => u.user.id === userId);

        if (!bannedUser) {
          return message.reply({
              embeds: [new EmbedBuilder().setDescription(reply.System.UnBan1.replace("[USER]", userId)).setColor("Red")],
              ephemeral: true,
              allowedMentions: { repliedUser: false }
            })
        }

        message.guild.members.unban(bannedUser.user).then((m) => {
          message.reply({
              content: reply.System.UnBan2.replace("[USER]", m.username),
              allowedMentions: { repliedUser: false }
            })
        })
      } catch (error) {
        console.log(error)
        return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
      }
    }
  };