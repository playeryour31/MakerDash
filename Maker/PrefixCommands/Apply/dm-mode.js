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
    name: "dm-mode",
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
            let types = ['on', 'off']
            let status = args[1]
            if (!types.includes(status.toLowerCase()))
                return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })

            let aaa;
            if (status.toLowerCase() == 'on') aaa = { accept: 'on', reject: 'on' }
            if (status.toLowerCase() == 'off') aaa = { accept: 'off', reject: 'off' }

            await db.set("dm_Mode_" + message.guild.id + "_" + client.user.id, {
                accept: aaa.accept,
                reject: aaa.reject,
            }).then(() => {
                return message.reply({ content: reply.Apply.Reply3.replace("[ACCEPTSTATUS]", aaa.accept).replace("[REJECTSTATUS]", aaa.reject), allowedMentions: { repliedUser: false } })
            })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};