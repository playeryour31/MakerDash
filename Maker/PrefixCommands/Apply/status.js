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
    name: "apply-status",
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
              let types = ['on','off']
              let applectionID = args[0]
              let status = args[1]
              if(!status) return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              if(!types.includes(status.toLowerCase()))
               return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })

               if(isNaN(applectionID))
               return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })

               await db.set("applectionStatus_" + applectionID + "_" + client.user.id, status.toLowerCase()).then(() =>{
                return message.reply({ content: reply.Apply.Reply2.replace("[ID]", applectionID).replace("[STATUS]", status.toLowerCase()), allowedMentions: { repliedUser: false } })
               })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};