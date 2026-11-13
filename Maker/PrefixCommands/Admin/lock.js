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
    name: "lock",
    type: "System",
    botP: [PermissionFlagsBits.ManageChannels],
    userP: [PermissionFlagsBits.ManageChannels],
    P: "ManageChannels",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel
            const everyoneperms = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);
            if(everyoneperms?.deny?.toArray()?.includes("SendMessages")){
                message.reply({content: reply.System.Lock2.replace("[ROOM]",channel), ephemeral: true, allowedMentions: { repliedUser: false } })
                return
            }

            channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false }).then(() => {
                message
                    .reply({
                        content: reply.System.Lock1.replace("[ROOM]", channel),
                        allowedMentions: { repliedUser: false }
                    })
            });
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};