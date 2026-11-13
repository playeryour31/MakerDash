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
        .setName('apply-status')
        .setDescription('Enable/Disabled application for new applies.')
        .addStringOption(id => id
            .setName("message_id")
            .setDescription("The applcetion message id.")
            .setRequired(true))
        .addStringOption(status => status
            .setName("status")
            .setDescription("Pick status.")
            .setRequired(true)
            .addChoices(
                { name: "ON", value: "on" },
                { name: "OFF", value: "off" },
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
            let applectionID = interaction.options.getString("message_id")
            let status = interaction.options.getString("status")

            if (isNaN(applectionID))
                return interaction.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })

            await db.set("applectionStatus_" + applectionID + "_" + client.user.id, status.toLowerCase()).then(() => {
                return interaction.reply({ content: reply.Apply.Reply2.replace("[ID]", applectionID).replace("[STATUS]", status.toLowerCase()), allowedMentions: { repliedUser: false } })
            })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};