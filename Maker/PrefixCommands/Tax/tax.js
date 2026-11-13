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

module.exports = {
    name: "tax",
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
            if (args.length < 1) {
                return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
            }
            let args1 = message.content.split(" ").slice(1).join(" ");

            if (args1.endsWith("m")) args1 = args1.replace(/m/gi, "") * 1000000;
            else if (args1.endsWith("k")) args1 = args1.replace(/k/gi, "") * 1000;
            else if (args1.endsWith("K")) args1 = args1.replace(/K/gi, "") * 1000;
            else if (args1.endsWith("M")) args1 = args1.replace(/M/gi, "") * 1000000;
            else if (args1.endsWith("B")) args1 = args1.replace(/B/gi, "") * 1000000000;
            else if (args1.endsWith("b")) args1 = args1.replace(/b/gi, "") * 1000000000;
        
            let args2 = parseInt(args1)
            let tax = Math.floor(args2 * (20) / (19) + (1))        
            message.reply({ content: `> ${tax}`, allowedMentions: { repliedUser: false } })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};