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
const db = require("../../lib/featureDb")("autoline")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list-autoline-channels')
        .setDescription('List all autoline channels in the database.'),

    type: "Autoline",
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
                       let channels = db.get("Autoline_" + interaction.guild.id + "_" + client.user.id) || [];

            if (channels.length === 0) {
                return interaction.reply({ content: reply.Autoline.Reply8, ephemeral: true }); 
            }
            let channelList = channels.map(channelID => `- <#${channelID}>`).join('\n');

           let embed = new EmbedBuilder()
                .setTitle(reply.Autoline.Embeds.title)
                .setDescription(channelList)
                .setColor(interaction.guild.members.me.displayColor)
                .setFooter({ text: reply.Autoline.Embeds.footer.replace('[LENGTH]', channels.length) }) 

            interaction.reply({ embeds: [embed], ephemeral: false });

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};