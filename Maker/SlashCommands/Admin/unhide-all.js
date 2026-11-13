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
        .setName('unhide-all')
        .setDescription('Allows @everyone to view all channels.')
    ,
    type: "System",
    botP: [PermissionFlagsBits.ManageChannels],
    userP: [PermissionFlagsBits.ManageChannels],
    P: "ManageChannels"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
                await interaction.deferReply({ ephemeral: false });

            const channels = interaction.guild.channels.cache.filter(ch => ch.type !== ChannelType.GuildCategory);

            let unhiddenChannels = 0;
            let alreadyVisibleChannels = 0;

            for (const channel of channels.values()) {
                const everyoneperms = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
                if (!everyoneperms || !everyoneperms.deny?.toArray()?.includes("ViewChannel")) {
                    alreadyVisibleChannels++;
                    continue;
                }

                await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: null });
                unhiddenChannels++;
            }

            let replyMessage;
            if (unhiddenChannels === 0 && alreadyVisibleChannels > 0) {
                replyMessage = reply.System.Show.replace("[ROOM]", "all channels");
            } else {
                replyMessage = reply.System.Show.replace("[ROOM]", "all channels");
            }

            await interaction.editReply({
                content: replyMessage,
                allowedMentions: { repliedUser: false }
            });

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};