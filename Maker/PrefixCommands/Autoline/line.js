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
const db = require("../../lib/featureDb")("autoline")

module.exports = {
    name: "line",
    type: "Autoline",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            let line = db.get("Line_" + message.guild.id + "_" + client.user.id) || null
            if(!line) return message.reply({content: reply.Autoline.Reply6 , allowedMentions: {repliedUser: false}})
            message.delete().catch(() =>{})
            let mode = db.get(`autolindeMode_${message.guild?.id}_${client.user.id}`) || "file"
            if(mode == "file"){
              message.channel.send({ files: [line] })
            }else if(mode == "message"){
              message.channel.send(`${line}`)
            }else if(mode == "embed"){
              let embed = new EmbedBuilder()
              .setColor(message.guild?.members?.me.displayHexColor)
              .setImage(line)
              message.channel.send({embeds: [embed]})
            }
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};