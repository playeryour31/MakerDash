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
const db = require("../../lib/featureDb")("protection")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-log')
        .setDescription('Set protection logging channel.')
        .addChannelOption(channel => channel
            .setName("channel")
            .setDescription("Pick the channel.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
    ,
    type: "Protection",
    botP: [],
    userP: [],
    P: ""
    ,
    support: false,
    ownerOnly: true,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let channel = interaction.options.getChannel("channel")

            db.set("protectionLog_" + interaction.guild.id + "_" + client.user.id, channel.id).then(() => {
                return interaction.reply({ content: reply.Protection.Reply8.replace("[CHANNEL]", channel), allowedMentions: { repliedUser: false } })
            })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};