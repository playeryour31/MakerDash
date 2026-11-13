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
const db = require("../../lib/featureDb")("autoline")
const isImageUrl = require('is-image-url');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-line')
        .setDescription('Set/Change autoline line.')
        .addStringOption(line => line
            .setName("line")
            .setDescription("Put your line image url.")
            .setRequired(true)
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
            let line = interaction.options.getString("line")
            if (line && !isImageUrl(line)) {
                return interaction.reply({ content: reply.Others.Reply1, allowedMentions: { repliedUser: false } });
            }
            db.set('Line_' + interaction.guild.id + "_" + client.user.id, line).then(() => {
                const done = new EmbedBuilder()
                    .setColor(`DarkButNotBlack`)
                    .setDescription(reply.Autoline.Reply1)
                    .setImage(line);
                interaction.reply({ embeds: [done], allowedMentions: { repliedUser: false } })
            })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};