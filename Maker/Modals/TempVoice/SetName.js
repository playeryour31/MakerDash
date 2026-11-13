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
const { Database } = require("st.db");
const TempDB = require("../../lib/featureDb")("sys_voicetemp");
const TempCatchDB = require("../../lib/featureDb")("temp_channels");

module.exports = {
    name: "setname",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const channel = interaction.customId.split("_")[1].trim()
            const name = interaction.fields.getTextInputValue("name")
	  const voiceChannel = await interaction.guild.channels.fetch(channel);
        if (!voiceChannel) {
                return interaction.reply({
                    content: reply.TempVoice.Reply26, 
                    ephemeral: true,
                });
            }

            await voiceChannel.setName(name)
                .then(() => {
                    return interaction.reply({
                content: reply.TempVoice.Reply32.replace("[NAME]", name),
                        ephemeral: true,
                    });
                })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } }).catch(() => {
                return interaction.channel.send({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
            })
        }
    }
}