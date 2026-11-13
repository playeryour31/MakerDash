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
const tokendb = new Database("/Database/Others/Tokens.json");
const axios = require("axios");

module.exports = {
    name: "banner",
    type: "General",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            let member = message.mentions.members.first() || message.guild.members.cache.get(args[1]) || message.member

            let tokens = tokendb.get("Bots")
            const data = tokens.find((data) => data.ClientID === client.user.id);

            axios
                .get(`https://discord.com/api/users/${member.id}`, {
                    headers: {
                        Authorization: `Bot ${data.Token}`,
                    },
                })
                .then((res) => {
                    const { banner, accent_color } = res.data;

                    if (banner) {
                        const extension = banner.startsWith("a_") ? ".gif" : ".png";
                        const url = `https://cdn.discordapp.com/banners/${member.id}/${banner}${extension}?size=2048`;

                        let button = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setLabel("Download")
                                .setURL(url)
                        );

                        const embed = new EmbedBuilder()
                            // .setAuthor({name:`${member.user.username}`,iconURL: member.displayAvatarURL({ dynamic: true })})
                            .setImage(url)
                            .setColor(message.guild.members.me.displayColor)
                            .setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

                        message
                            .reply({ embeds: [embed], components: [button], allowedMentions: { repliedUser: false } })

                    } else {
                        if (accent_color) {
                            message.reply({content: reply.System.Banner1.replace("[USER]", member.user.username), allowedMentions: { repliedUser: false }})
                        } else {
                            message.reply({content: reply.System.Banner1.replace("[USER]", member.user.username), allowedMentions: { repliedUser: false }})
                        }
                    }
                })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};