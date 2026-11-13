const {
    Client,
    Collection,
    Discord,
    createInvite,
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
const { ChannelType } = require("discord-api-types/v9");
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("feedback")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-feedback')
        .setDescription('Remove feedback channel.')
        .addChannelOption(channel => channel
            .setName("channel")
            .setDescription("Pick the channel to remove.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
            )
    ,
    type: "Feedback",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let channel = interaction.options.getChannel("channel")

            let channels = db.get("Feedback_" + interaction.guild.id + "_" + client.user.id) || []
            if (channels.includes(channel.id)) {
                db.pull("Feedback_" + interaction.guild.id + "_" + client.user.id, channel.id).then(() => {
                    return interaction.reply({ content: reply.Feedback.Reply3.replace("[CHANNEL]", channel), allowedMentions: { repliedUser: false } })
                })
            }else{
                return interaction.reply({content: reply.Feedback.Reply4.replace("[CHANNEL]", channel), allowedMentions: {repliedUser: false}})
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};