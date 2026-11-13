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
const db = require("../../lib/applyDb")
module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm-mode')
        .setDescription('Apply system DM mode.')
        .addStringOption(type => type
            .setName("action_type")
            .setDescription("Pick type.")
            .setRequired(true)
            .addChoices(
                {name: 'Accept', value: "accept"},
                {name: 'Reject', value: "reject"}
            ))
            .addStringOption(type => type
                .setName("mode")
                .setDescription("DM mode")
                .setRequired(true)
                .addChoices(
                    {name: 'ON', value: "on"},
                    {name: 'OFF', value: "off"}
                ))
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
            let action_type = interaction.options.getString("action_type")
            let mode = interaction.options.getString("mode")

            let data = await db.get("dm_Mode_" + interaction.guild.id + "_" + client.user.id) || {accept: "off", reject: "off"}
            if(action_type == "accept"){
                await db.set("dm_Mode_" + interaction.guild.id + "_" + client.user.id,{
                    accept: mode,
                    reject: data.reject || 'off',
                }).then(() =>{
                    return interaction.reply({ content: reply.Apply.Reply3.replace("[ACCEPTSTATUS]", mode).replace("[REJECTSTATUS]", data.reject || "off"), allowedMentions: { repliedUser: false } })
                })
            }else{
                await db.set("dm_Mode_" + interaction.guild.id + "_" + client.user.id,{
                    accept: data.accept || 'off',
                    reject: mode,
                }).then(() =>{
                    return interaction.reply({ content: reply.Apply.Reply3.replace("[ACCEPTSTATUS]", data.accept || "off").replace("[REJECTSTATUS]", mode), allowedMentions: { repliedUser: false } })
                })
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};