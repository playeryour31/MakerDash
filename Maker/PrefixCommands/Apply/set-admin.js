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
    name: "apply-admin",
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

              let role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0])
              if(!role) return message.reply({ content: reply.NotFound.Reply5 , allowedMentions: { repliedUser: false } })


              await db.set("applyAdmin_"+ message.guild.id + "_" + client.user.id, role.id).then(() =>{
                let embed = new EmbedBuilder()
                .setColor('Green')
                .setDescription( reply.Apply.Reply5.replace("[ROLE]", role))
                return message.reply({ embeds: [embed] , allowedMentions: { repliedUser: false } })
              })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};