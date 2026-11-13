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
    Message,
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
    PermissionOverwriteManager,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
} = require("discord.js");
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("giveaway")
const moment = require('moment-timezone');
moment.tz.setDefault('Africa/Cairo');

module.exports = {
    name: "gend",
    type: "Giveaway",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            if (args.length < 1) {
                return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              }

              const ID = args[0]

              if (isNaN(ID)) return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              let endcheck = db.get(`${ID}_Data`) || null
              if (endcheck) return message.reply({ content: `${reply.Giveaway.Reply1}`, ephemeral: true, allowedMentions: { repliedUser: false }});
              const data = db.get(`RunningGiveaway_${client.user.id}`)
              if (!data.length) return message.reply({ content: `${reply.Giveaway.Reply2}`, ephemeral: true, allowedMentions: { repliedUser: false } });
              const DB = data.filter(da => da.messageID === ID);
              if (!DB) return message.reply({ content: `${reply.Giveaway.Reply2}`, ephemeral: true, allowedMentions: { repliedUser: false } });
        
              const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
        
              DB[0].Time = currentTime
        
              db.set(`RunningGiveaway_${client.user.id}`, data).then(() => {
                message.delete()
              })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};