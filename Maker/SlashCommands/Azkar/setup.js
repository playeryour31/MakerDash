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
    ChatInputCommandInteraction
} = require("discord.js");
const { ChannelType } = require("discord-api-types/v9");
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("azkar")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-azkar')
        .setDescription('Setup the Azkar configuration.')
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Select the channel to send Azkar.")
                .setRequired(true)
        )

        .addStringOption(type => type
            .setName("mode")
                .setDescription("Pick the mode for Azkar.")
            .setRequired(true)
            .addChoices(
               // {name: "Webhook", value: "webhook"},
                {name: "Message", value: "message"},
                {name: "Embed", value: "embed"},
            )
            )


    ,
    type: "Muslim",
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
            const channel = interaction.options.getChannel("channel");
            const mode = interaction.options.getString("mode");

           await db.set(`Azkar_${client.user.id}`, {
                Mode: mode,
                Channel: channel.id
            }).then(() =>{
                interaction.reply({
                    content: reply.Azkar.Reply1,
                    allowedMentions: {repliedUser: false}
                })
            })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};