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
const isImageUrl = require('is-image-url');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Send a specific mbed message to a specific channel.')
        .addStringOption(message => message
            .setName("message")
            .setDescription('the message to send.')
            .setRequired(true)
            .setMaxLength(4000))
        .addStringOption(img => img
            .setName("image_url")
            .setDescription("Image to add to the embed message."))
        .addStringOption(img => img
            .setName("thumbnail_url")
            .setDescription("Thumbnail image add to embed message."))
            .addChannelOption(channel => channel
            .setName("channel")
            .setDescription("channel to send message to.")
            .setRequired(false))
    ,
    type: "System",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let channel = interaction.options.getChannel("channel")||interaction.channel
            let message = interaction.options.getString("message")
            let image = interaction.options.getString("image_url")
            let thumbnail = interaction.options.getString("thumbnail_url")

            const themessage = message.replace(/\\n/g, '\n');

            let embed = new EmbedBuilder()
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setColor(interaction.guild.members.me.displayHexColor)
                .setDescription(themessage)
                .setTimestamp();

            if (image && isImageUrl(image)) {
                embed.setImage(image)
            }
            if (thumbnail && isImageUrl(thumbnail)) {
                embed.setThumbnail(thumbnail)
            }
            channel.send({ embeds: [embed] }).then(() => {
                interaction.reply({ content: reply.System.Embed2, ephemeral: true})
            }).catch((error) => {
                interaction.reply({ content: reply.System.Embed3, ephemeral: true })
            })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};