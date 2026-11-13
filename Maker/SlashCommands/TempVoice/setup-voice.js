const {
    Client,
    ChannelType,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits
} = require("discord.js");
const { Database } = require("st.db");
const db = require("../../lib/featureDb")("temp_voice");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup-temp")
        .setDescription("Setup the TempChannel panel.")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Select the channel to send the panel.")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(option =>
            option
                .setName("category")
                .setDescription("Select category for creating voice channels.")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildCategory)
        ),
    type: "TempVoice",
    botP: [], 
    userP: [], 
    P: "Administrator",
    support: false,
    ownerOnly: true,

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const channel = interaction.options.getChannel("channel");
            const category = interaction.options.getChannel("category");
            const guildId = interaction.guild.id;
            const botId = client.user.id;
            const existingData = db.get(`TempVoice_${guildId}_${botId}`);

            if (existingData) {
                const oldVoiceChannel = interaction.guild.channels.cache.get(existingData.voiceChannelId);
                if (oldVoiceChannel) {
                    await oldVoiceChannel.delete();
                }
            }

            const voiceChannel = await interaction.guild.channels.create({
                name: `➕ Creator Channel`, 
                type: ChannelType.GuildVoice,
                parent: category.id, 
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                    },
                ],
            });

            const panelEmbed = new EmbedBuilder()
                .setTitle(reply.TempVoice.Embeds.Embed1.Title)
                .setDescription(reply.TempVoice.Embeds.Embed1.Description)
                .setColor(interaction.guild.members.me.displayHexColor)
                .setFooter({ text: reply.TempVoice.Embeds.Embed1.Footer, iconURL: client.user.displayAvatarURL() });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("set_name")
                    .setLabel(reply.TempVoice.Buttons.set_name || "Set Name")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("📝"),

                new ButtonBuilder()
                    .setCustomId("lock_channel")
                    .setLabel(reply.TempVoice.Buttons.lock || "Lock")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🔒"),

                new ButtonBuilder()
                    .setCustomId("unlock_channel")
                    .setLabel(reply.TempVoice.Buttons.unlock || "Unlock")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🔓"),

                new ButtonBuilder()
                    .setCustomId("show_channel")
                    .setLabel(reply.TempVoice.Buttons.show || "Show")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("👁️"),

                new ButtonBuilder()
                    .setCustomId("hide_channel")
                    .setLabel(reply.TempVoice.Buttons.hide || "Hide")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🚫")
            );

            const buttonsRow2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("users_limit")
                    .setLabel(reply.TempVoice.Buttons.users_limit || "Users Limit")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("👥"),

                new ButtonBuilder()
                    .setCustomId("kick_user")
                    .setLabel(reply.TempVoice.Buttons.kick || "Kick")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("👢"),

                new ButtonBuilder()
                    .setCustomId("delete_channel")
                    .setLabel(reply.TempVoice.Buttons.delete || "Delete")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🗑️")
            );

            const msg = await channel.send({
                embeds: [panelEmbed],
                components: [buttons, buttonsRow2]
            });

            const savedData = db.set(`TempVoice_${guildId}_${botId}`, {
                panelChannel: channel.id,
                voiceCategory: category.id,
                voiceChannelId: voiceChannel.id,
                msg: msg.id,
            });

            return interaction.reply({
                content: reply.TempVoice.Reply1,
                ephemeral: false
            });
        } catch (error) {
            console.log(error);
            return interaction.channel.send({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    }
};
