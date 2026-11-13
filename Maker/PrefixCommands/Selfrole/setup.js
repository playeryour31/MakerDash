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

module.exports = {
    name: "selfrole-setup",
    type: "Selfrole",
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
            let channel = message.mentions.channels.array()[0] || message.guild.channels.cache.get(args[1])
            let type = args[3]
            if(!role || !channel || !type) return message.reply({ embeds: [replyEmbeds.usageEmbed] , allowedMentions: { repliedUser: false } })
            if(type.toLowerCase() != "button" && type.toLowerCase() != "selectmenu") return message.reply({ embeds: [replyEmbeds.usageEmbed] , allowedMentions: { repliedUser: false } })

            const button = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                  .setCustomId(channel.id + "_" + role.id + "_" + type + "_new-selfrole")
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji(`📜`)
              ]);

            return message.reply({ content: reply.Selfrole.Reply1 , components: [button] , allowedMentions: { repliedUser: false } })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};