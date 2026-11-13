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
        .setName('hide-all')
        .setDescription('Disables @everyone from viewing all channels.')
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

            let hiddenChannels = 0;
            let alreadyHiddenChannels = 0;

            for (const channel of channels.values()) {
                const everyoneperms = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
                if (everyoneperms?.deny?.toArray()?.includes("ViewChannel")) {
                    alreadyHiddenChannels++;
                    continue;
                }

                await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
                hiddenChannels++;
            }

            let replyMessage;
            if (hiddenChannels === 0 && alreadyHiddenChannels > 0) {
                replyMessage = reply.System.Hide2.replace("[ROOM]", "all channels");
            } else {
                replyMessage = reply.System.Hide1.replace("[ROOM]", "all channels");
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