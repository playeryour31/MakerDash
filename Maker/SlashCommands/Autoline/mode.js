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
const db = require("../../lib/featureDb")("autoline")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoline-mode')
        .setDescription('Change autoline mode.')
        .addStringOption(type => type
            .setName("mode")
            .setDescription("Pick the mode.")
            .setRequired(true)
            .addChoices(
                {name: "File", value: "file"},
                {name: "Message", value: "message"},
                {name: "Embed", value: "embed"},
            )
            )
    ,
    type: "Autoline",
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
            let mode = interaction.options.getString("mode")
            db.set(`autolindeMode_${interaction.guild.id}_${client.user.id}`, mode).then(() =>{
                interaction.reply({
                    content: reply.Autoline.Reply7.replace("[MODE]", mode),
                    allowedMentions: {repliedUser: false}
                })
            })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};