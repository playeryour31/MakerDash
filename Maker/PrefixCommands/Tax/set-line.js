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
const db = require("../../lib/featureDb")("tax")
const isImageUrl = require('is-image-url');

module.exports = {
    name: "set-taxline",
    type: "Tax",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            const line = args[0]
            if(line){
                if (!isImageUrl(line)) {
                    return message.reply({ content: reply.Others.Reply1, allowedMentions: { repliedUser: false } });
                }
                db.set("TaxLine_" + message.guild.id + "_" + client.user.id, line).then(() => {
                    const done = new EmbedBuilder()
                        .setColor(`DarkButNotBlack`)
                        .setDescription(reply.Tax.Reply5)
                        .setImage(line);
                    message.reply({ embeds: [done], allowedMentions: { repliedUser: false } })
                })
            }else{
                let check = db.get("TaxLine_" + message.guild.id + "_" + client.user.id) || null
                if(!check){
                    return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
                }else{
                    db.delete("TaxLine_" + message.guild.id + "_" + client.user.id).then(() =>{
                        message.reply({ content: reply.Tax.Reply6, allowedMentions: { repliedUser: false } })
                    })
                }
            }

        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};