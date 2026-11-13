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
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db")
const tokendb = new Database("/Database/Others/Tokens.json");
const axios = require("axios");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Display your\'s banner or someone else\'s banner.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("The user to get banner for."))
    ,
    type: "General",
    botP: [],
    userP: [],
    P: ""
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const userOption = interaction.options.getUser("user");
            const member = userOption ? userOption : interaction.user;

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
                            .setColor(interaction.guild.members.me.displayColor)
                            .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

                        interaction
                            .reply({ embeds: [embed], components: [button] })

                    } else {
                        if (accent_color) {
                            interaction
                                .reply(
                                    `${reply.Bots.System.Public.Banner1.replace("[USER]", member.user.username)}`
                                )
                        } else {
                            interaction
                                .reply(
                                    `${reply.Bots.System.Public.Banner1.replace("[USER]", member.user.username)}`
                                )
                        }
                    }
                })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};