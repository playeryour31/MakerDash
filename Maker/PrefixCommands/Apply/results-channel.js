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
const db = require("../../lib/applyDb")
module.exports = {
    name: "set-results",
    type: "Apply",
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

              let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0])
              if(!channel) return message.reply({ content: reply.NotFound.Reply4 , allowedMentions: { repliedUser: false } })


              await db.set("resultsLog_"+ message.guild.id + "_" + client.user.id, channel.id).then(() =>{
                return message.reply({ content: reply.Apply.Reply4.replace("[CHANNEL]", channel) , allowedMentions: { repliedUser: false } })
              })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};