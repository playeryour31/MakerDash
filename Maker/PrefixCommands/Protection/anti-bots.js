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
    name: "anti-bots",
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
              if(!type) return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })

              let status = ['on','off']
              if(!status.includes(type.toLowerCase()))
               return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })

               db.set("antiBots_" + message.guild.id + "_" + client.user.id, type.toLowerCase()).then(() =>{
                return message.reply({ content: reply.Protection.Reply6.replace("[STAUS]", type.toLowerCase()), allowedMentions: { repliedUser: false } })
               })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};