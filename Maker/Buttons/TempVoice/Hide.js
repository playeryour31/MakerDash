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
	PermissionsBitField
} = require("discord.js");
const moment = require("moment");
const { Database } = require("st.db");
const TempDB = require("../../lib/featureDb")("sys_voicetemp");
const TempSettingsDB = require("../../lib/featureDb")("temp_voice");
const TempCatchDB = require("../../lib/featureDb")("temp_channels");

module.exports = {
    name: "hide_channel",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction, language, reply, embeds) => {
        try {
            const user = interaction.member;
            const guild = interaction.guild;

            const status = await TempDB.get(client.user?.id + "_" + guild.id + "_" + user.id);
            if (!status) {
                return interaction.reply({
                    content: reply.TempVoice.Reply5,
                    ephemeral: true,
                });
            }

            const voiceChannel = user.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    content: reply.TempVoice.Reply31,
                    ephemeral: true,
                });
            }

            const settings = await TempCatchDB.get(`Channel_${guild.id}_${client.user.id}_${voiceChannel.id}`);
            if (!settings) {
                return interaction.reply({
                    content: reply.TempVoice.Reply7, 
                    ephemeral: true,
                });
            }
const owner = settings.owner;
if (user.id !== owner) {
    return interaction.reply({
        content: reply.TempVoice.Reply30,
        ephemeral: true
    });
}
            const isHidden = voiceChannel.permissionOverwrites.cache.has(guild.id) && voiceChannel.permissionOverwrites.cache.get(guild.id).deny.has(PermissionFlagsBits.ViewChannel);
        if (isHidden) {
                return interaction.reply({
                    content: reply.TempVoice.Reply9,
                    ephemeral: true,
                });
            }
 await voiceChannel.permissionOverwrites.edit(guild.id, {
                [PermissionFlagsBits.ViewChannel]: false,
            });

       return interaction.reply({
                content: reply.TempVoice.Reply8,
                ephemeral: true,
            });
        
                

        } catch (error) {
            console.log(error);
            return interaction.reply({
                embeds: [embeds.errorEmbed],
                ephemeral: true,
                allowedMentions: { repliedUser: false }
            });
        }
    }
};
