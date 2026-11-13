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
        .setName('lock-all')
        .setDescription('Disable @everyone from sending messages in all channels.')
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

            const channels = interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText);

            let lockedChannels = 0;
            let alreadyLockedChannels = 0;

            for (const channel of channels.values()) {
                const everyoneperms = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
                if (everyoneperms?.deny?.toArray()?.includes("SendMessages")) {
                    alreadyLockedChannels++;
                    continue;
                }

                await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
                lockedChannels++;
            }

            let replyMessage;
            if (lockedChannels === 0 && alreadyLockedChannels > 0) {
                replyMessage = reply.System.Lock2.replace("[ROOM]", "all channels");
            } else {
                replyMessage = reply.System.Lock1.replace("[ROOM]", "all channels");
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