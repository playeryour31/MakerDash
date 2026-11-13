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
const db = require("../../lib/featureDb")("suggestion")
const isImageUrl = require('is-image-url');

module.exports = {
    name: "set-suggestionline",
    type: "Suggestion",
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
                db.set("SuggestionLine_" + message.guild.id, line).then(() => {
                    const done = new EmbedBuilder()
                        .setColor(`DarkButNotBlack`)
                        .setDescription(reply.Suggestion.Reply1)
                        .setImage(line);
                    message.reply({ embeds: [done], allowedMentions: { repliedUser: false } })
                })
            }else{
                let check = db.get("SuggestionLine_" + message.guild.id + "_" + client.user.id) || null
                if(!check){
                    return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
                }else{
                    db.delete("SuggestionLine_" + message.guild.id + "_" + client.user.id).then(() =>{
                        message.reply({ content: reply.Suggestion.Reply6, allowedMentions: { repliedUser: false } })
                    })
                }
            }

        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};