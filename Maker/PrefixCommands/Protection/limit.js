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
const db = require("../../lib/featureDb")("protection")

module.exports = {
    name: "actions-limit",
    type: "Protection",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: true,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            if (args.length < 1) {
                return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              }

              let type = args[0]
              let limit = args[1]
              if(!type || !limit) return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              if(isNaN(limit) || parseInt(limit) < 1) return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })

              let actions = ['bans','kicks','delete_roles','create_roles','delete_channel','create_channel','add_bots']
              if(!actions.includes(type.toLowerCase()))
               return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })

               

              db.set("actionLimit_"+ type.toLowerCase() + "_" + message.guild.id + "_" + client.user.id, parseInt(limit)).then(() =>{
                return message.reply({ content: reply.Protection.Reply7.replace("[ACTION]", type.toLowerCase()).replace("[LIMIT]", limit) , allowedMentions: { repliedUser: false } })
              })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};