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
    name: "send",
    type: "System",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            const member = message.mentions.members.first() || (await message.guild.members.fetch(args[0]).catch());
            const msg = args.slice(1).join(" ");

            if (!args[0]) return message.reply({ content: reply.Others.Reply4, allowedMentions: { repliedUser: false } })


            if (!member) return message.reply({ content: reply.NotFound.Reply2, allowedMentions: { repliedUser: false } })

            if (member) {
                if (!msg) return message.reply({content: reply.System.Send1, allowedMentions: { repliedUser: false }});
                let image = message.attachments.first();
                if (image) {
                    member
                        .send({ content: `${msg}`, files: [image.proxyURL] })
                        .then(() => {
                            message.reply({content: reply.System.Send2.replace('[USER]', member.user.username)})

                        })
                        .catch((err) => {
                            message.reply({content: reply.System.Send3.replace('[USER]', member.user.username)});
                        });
                } else {
                    if (!msg) return message.reply({content: reply.System.Send1});
                    member
                        .send({ content: `${msg}` })
                        .then(() => {
                            message
                                .reply({content: reply.System.Send2.replace('[USER]', member.user.username)})

                        })
                        .catch((err) => {
                            message.reply({content: reply.System.Send3.replace('[USER]', member.user.username), allowedMentions: { repliedUser: false }})
                        });
                }
            }
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};