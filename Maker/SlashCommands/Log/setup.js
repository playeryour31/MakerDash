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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('log-setup')
        .setDescription('Setup logging system.')
    ,
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator"
    ,
    type: "Log",
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const dataMenu = new ActionRowBuilder()
            .addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(`LogSelector`)
                .setPlaceholder('Select log event from here')
                .addOptions(require("../../Utils/Logs/Logs.json").Logs)
                .setMinValues(1)
                .setMaxValues(1)
            );

          interaction.reply({ components: [dataMenu], allowedMentions: { repliedUser: false } })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};