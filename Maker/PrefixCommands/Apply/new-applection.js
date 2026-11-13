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
    name: "new-application",
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
            let role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0])
            let app_channel = message.mentions.channels.array()[0] || message.guild.channels.cache.get(args[1])
            let req_channel = message.mentions.channels.array()[1] || message.guild.channels.cache.get(args[2])
            if(!role || !app_channel || !req_channel) return message.reply({ embeds: [replyEmbeds.usageEmbed] , allowedMentions: { repliedUser: false } })

            const button = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                  .setCustomId(app_channel.id + "_" + req_channel.id + "_" + role.id + "_new-application")
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji(`📜`)
              ]);

            return message.reply({ content: reply.Apply.Reply1 , components: [button] , allowedMentions: { repliedUser: false } })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};