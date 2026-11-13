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
    ActionRowBuilder,
    EmbedBuilder
} = require("discord.js");
const { Database } = require("st.db");
const TempDB = require("../../lib/featureDb")("sys_voicetemp");
const TempCatchDB = require("../../lib/featureDb")("temp_channels");

module.exports = {
    name: "users_limit",
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

            const status = await TempDB.get(`${client.user?.id}_${guild.id}_${user.id}`);
            if (!status) {
                return interaction.reply({
                    content: reply.TempVoice.Reply2, 
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
                    content: reply.TempVoice.Reply22,
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
            const dataMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`users-limits_${user.id}_${voiceChannel.id}`)
                    .setPlaceholder(reply.TempVoice.SelectMenu.Placeholder1)
                    .addOptions(reply.TempVoice.SelectMenu.Limits)
                    .setMinValues(1)
                    .setMaxValues(1)
            );

            return interaction.reply({
                content: reply.TempVoice.SelectMenu.MenuMessage, 
                components: [dataMenu],
                ephemeral: true,
                allowedMentions: { repliedUser: false }
            });
        } catch (error) {
            console.error(error);
            return interaction.reply({
                embeds: [embeds.errorEmbed],
                ephemeral: true,
                allowedMentions: { repliedUser: false }
            });
        }
    }
};
