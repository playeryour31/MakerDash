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
const isImageUrl = require('is-image-url');

module.exports = {
    name: "set-line",
    type: "Autoline",
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
            if (line && !isImageUrl(line)) {
                return message.reply({ content: reply.Others.Reply1, allowedMentions: { repliedUser: false } });
            }
            db.set('Line_' + message.guild.id + "_" + client.user.id, line).then(() => {
                const done = new EmbedBuilder()
                    .setColor(`DarkButNotBlack`)
                    .setDescription(reply.Autoline.Reply1)
                    .setImage(line);
                message.reply({ embeds: [done], allowedMentions: { repliedUser: false } })
            })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};