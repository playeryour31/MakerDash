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
    name: "embed",
    type: "System",
    botP: [],
    userP: [PermissionFlagsBits.ManageMessages],
    P: "ManageMessages",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
            if (!channel) {
                return message.reply({content: reply.Others.Reply3, allowedMentions: { repliedUser: false }}).catch(async (error) => { return console.log(error.message) })
            }

            let args1 = args.slice(1).join(" ");

            if (!args1) {
                message.reply({ content: reply.System.Embed1, allowedMentions: { repliedUser: false } });
            }
            let embed = new EmbedBuilder()
                .setAuthor({ name: `${message.guild.name}`, iconURL: message.guild.iconURL({ dynamic: true }) })
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
                .setColor(message.guild.members.me.displayHexColor)
                .setTimestamp();

            let attach = message.attachments.first();
            if (attach) {
                embed.setImage(attach.proxyURL);
                if (args1) {
                    embed.setDescription(`${args1}`);
                }
            }
            if (args1) {
                embed.setDescription(`${args1}`);
                channel.send({ embeds: [embed] }).then(() => {
                    message.react('✔').catch()
                }).catch((error) =>{
                    console.log(error.message)
                    message.react('❌').catch()
                })
            }
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};