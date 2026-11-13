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
    name: "set-automode",
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

              let action = args[0]
              let type = args[1]
              if(!action || !type) return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              
              let actions = ['bans','kicks','delete_roles','create_roles','delete_channel','create_channel','add_bots']
              if(!actions.includes(action.toLowerCase())) return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              
              let types = ['kick','ban','delete_roles']
              if(!types.includes(type.toLowerCase())) return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })

              db.set("autoMode_" + action + "_" + message.guild.id + "_" + client.user.id,type).then(() =>{
                message.reply(reply.Protection.Reply9.replace("[ACTION]",action).replace("[TYPE]", type))
            })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};