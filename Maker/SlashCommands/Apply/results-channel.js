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
    ChatInputCommandInteraction,
} = require("discord.js");
const { ChannelType } = require("discord-api-types/v9");
const db = require("../../lib/applyDb")
module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-results')
        .setDescription('Set/Change results channel for apply system.')
        .addChannelOption(channel => channel
            .setName("channel")
            .setDescription("pick the results channel.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
    ,
    type: "Apply",
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

            await db.set("resultsLog_"+ interaction.guild.id + "_" + client.user.id, channel.id).then(() =>{
                return interaction.reply({ content: reply.Apply.Reply4.replace("[CHANNEL]", channel) , allowedMentions: { repliedUser: false } })
              })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};