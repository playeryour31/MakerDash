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
        .setName('actions-limit')
        .setDescription('Set action limit for @everyone.')
            .addStringOption(action => action
                .setName("action")
                .setDescription("Pick the action.")
                .addChoices(
                    {name: "Ban",value: "ban"},
                    {name: "Kick",value: "kick"},
                    {name: "Delete Roles",value: "delete_roles"},
                    {name: "Create Roles",value: "create_roles"},
                    {name: "Delete Channel",value: "delete_channel"},
                    {name: "Create Channel",value: "create_channel"},
                    {name: "Add Bots",value: "add_bots"},
                )
                .setRequired(true))
                .addIntegerOption(limit => limit
                    .setName("limit")
                    .setMinValue(1)
                    .setDescription("Type the limit for the action.")
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
            let type = interaction.options.getString("action")
            let limit = interaction.options.getInteger("limit")
            
            db.set("actionLimit_"+ type.toLowerCase() + "_" + interaction.guild.id + "_" + client.user.id, parseInt(limit)).then(() =>{
                return interaction.reply({ content: reply.Protection.Reply7.replace("[ACTION]", type.toLowerCase()).replace("[LIMIT]", limit) , allowedMentions: { repliedUser: false } })
              })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};