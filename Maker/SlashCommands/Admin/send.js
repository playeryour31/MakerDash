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
        .setName('send')
        .setDescription('Send a specific message to a specific member.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("user to send message to.")
            .setRequired(true))
        .addStringOption(message => message
            .setName("message")
            .setDescription('the message to send.')
            .setRequired(true)
            .setMaxLength(4000))
        .addStringOption(img => img
            .setName("image_url")
            .setDescription("image to send with the message."))
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
            let user = interaction.options.getUser("user")
            let message = interaction.options.getString("message")
            let image = interaction.options.getString("image_url")
            const themessage = message.replace(/\\n/g, '\n');

            const member = await interaction.guild.members.fetch(user.id).catch();
            if (!member) return interaction.reply({ content: reply.NotFound.Reply2, ephemeral: true, allowedMentions: { repliedUser: false } })

            if (image && isImageUrl(image)) {
                member.send({ content: `${themessage}`, files: [image] }).then(() => {
                    interaction.reply({ content: reply.System.Send2.replace('[USER]', member.user.username) })
                }).catch((error) => {
                    interaction.reply({ content: reply.System.Send3.replace('[USER]', member.user.username), ephemeral: true })
                })
            } else {
                member.send({ content: `${themessage}` }).then(() => {
                    interaction.reply({ content: reply.System.Send2.replace('[USER]', member.user.username) })
                }).catch((error) => {
                    interaction.reply({ content: reply.System.Send3.replace('[USER]', member.user.username), ephemeral: true })
                })
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};