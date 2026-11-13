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
        .setName('set-automode')
        .setDescription('Set the automode for actions limit pass.')
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
                .addStringOption(automode => automode
                    .setName("automode")
                    .setDescription("Pick the automode for the action limit pass.")
                    .addChoices(
                        {name: "Ban",value: "ban"},
                        {name: "Kick",value: "kick"},
                        {name: "Delete Roles",value: "delete_roles"},
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
            let action = interaction.options.getString("action")
            let type = interaction.options.getString("automode")
            
            db.set("autoMode_" + action + "_" + interaction.guild.id + "_" + client.user.id , type).then(() =>{
              interaction.reply(reply.Protection.Reply9.replace("[ACTION]",action).replace("[TYPE]", type))
          })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};