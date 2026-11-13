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
        .setName('say')
        .setDescription('Send a specific message to a specific channel.')
        .addStringOption(message => message
            .setName("message")
            .setDescription('the message to send.')
            .setRequired(true)
            .setMaxLength(4000))
            .addStringOption(img => img
                .setName("image_url")
                .setDescription("image to send with the message."))
            .addChannelOption(channel => channel
            .setName("channel")
            .setDescription("Channel to send message to.")
            .setRequired(false))
    ,
    type: "System",
    botP: [],
    userP: [PermissionFlagsBits.ManageMessages],
    P: "ManageMessages"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let channel = interaction.options.getChannel("channel")||interaction.channel
            let message = interaction.options.getString("message")
            let image = interaction.options.getString("image_url")
            const themessage = message.replace(/\\n/g, '\n');
            
            if(image && isImageUrl(image)){
                channel.send({ content: `${themessage}`, files: [image] }).then(() =>{
                    interaction.reply({content: reply.System.Say2, ephemeral: true})
                }).catch((error) => {
                    interaction.reply({content: reply.System.Say3, ephemeral: true})
                })
            }else{
                channel.send({ content: `${themessage}`}).then(() =>{
                    interaction.reply({content: reply.System.Say2, ephemeral: true})
                }).catch((error) => {
                    interaction.reply({content: reply.System.Say3, ephemeral: true})
                })
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};