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
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContextMenuCommandBuilder,
    SlashCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    RoleSelectMenuBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db");

module.exports = {
    name: "kick-user",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @returns 
     */
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const user = interaction.values[0]; 
            const channelId = interaction.customId.split("_")[2].trim();
            const voiceChannel = await interaction.guild.channels.fetch(channelId);

            if (!voiceChannel) {
                return interaction.reply({
                    content: reply.TempVoice.Reply26,
                    ephemeral: true,
                });
            }
            const member = await interaction.guild.members.fetch(user.id); 
            if (!member.voice.channel || member.voice.channel.id !== voiceChannel.id) {
                return interaction.reply({
                    content: reply.TempVoice.Reply28,
                    ephemeral: true,
                });
            }

            await member.voice.disconnect();

            await interaction.update({
                content: reply.TempVoice.Reply29.replace("[USER]", user.tag),
                ephemeral: true,
                components: []
            });

        } catch (error) {
            console.log(error);
            return interaction.reply({
                embeds: [replyEmbeds.notFoundEmbed], 
                allowedMentions: { repliedUser: false }
            });
        }
    }
};
