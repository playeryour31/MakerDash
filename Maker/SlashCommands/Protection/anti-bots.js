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
        .setName('anti-bots')
        .setDescription('Enable/Disable anti bots system.')
            .addStringOption(type => type
                .setName("mode")
                .setDescription("Pick mode.")
                .addChoices(
                    {name: "ON",value: "on"},
                    {name: "OFF",value: "off"},
                )
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
            let type = interaction.options.getString("mode")
            
            db.set("antiBots_" + interaction.guild.id + "_" + client.user.id, type.toLowerCase()).then(() =>{
                return interaction.reply({ content: reply.Protection.Reply6.replace("[STAUS]", type.toLowerCase()), allowedMentions: { repliedUser: false } })
               })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};