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
        .setName('add-whitelist')
        .setDescription('Add user to bypass from protection system.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("The user to whitelist")
            .setRequired(true))
            .addStringOption(type => type
                .setName("type")
                .setDescription("Pick action type.")
                .addChoices(
                    {name: "All",value: "all"},
                    {name: "Ban",value: "ban"},
                    {name: "Kick",value: "kick"},
                    {name: "Delete Roles",value: "delete_roles"},
                    {name: "Create Roles",value: "create_roles"},
                    {name: "Delete Channel",value: "delete_channel"},
                    {name: "Create Channel",value: "create_channel"},
                    {name: "Add Bots",value: "add_bots"},
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
            let user = interaction.options.getUser("user")
            let type = interaction.options.getString("type")

            let member = interaction.guild.members.cache.get(user.id)
            if(!member){
              return interaction.reply({ content: reply.Protection.Reply1, allowedMentions: { repliedUser: false } })
            }

            let check = db.get("whiteList_" + interaction.guild.id + "_" + member.id + "_" + client.user.id) || []
            if(check.includes(type.toLowerCase())){
              return interaction.reply({ content: reply.Protection.Reply3.replace("[USER]", member).replace("[ACTION]", type.toLowerCase()), allowedMentions: { repliedUser: false } })
            }

            db.push("whiteList_" + interaction.guild.id + "_" + member.id + "_" + client.user.id, type.toLowerCase()).then(() =>{
              return interaction.reply({ content: reply.Protection.Reply2.replace("[ACTION]", type.toLowerCase()).replace("[USER]", member) , allowedMentions: { repliedUser: false } })
            })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};