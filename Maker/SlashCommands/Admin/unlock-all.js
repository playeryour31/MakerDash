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
        .setName('unlock-all')
        .setDescription('Enable @everyone from sending messages in all channels.')
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

            let unlockedChannels = 0;
            let alreadyUnlockedChannels = 0;

            for (const channel of channels.values()) {
                const everyoneperms = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
                if (!everyoneperms || !everyoneperms.deny?.toArray()?.includes("SendMessages")) {
                    alreadyUnlockedChannels++;
                    continue;
                }

                await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null });
                unlockedChannels++;
            }

            let replyMessage;
            if (unlockedChannels === 0 && alreadyUnlockedChannels > 0) {
                replyMessage = reply.System.UnLock.replace("[ROOM]", "all channels");
            } else {
                replyMessage = reply.System.UnLock.replace("[ROOM]", "all channels");
            }

            await interaction.editReply({
                content: replyMessage,
                allowedMentions: { repliedUser: false }
            });

        } catch (error) {
            console.log(error);
            return interaction.editReply({ embeds: [replyEmbeds.errorEmbed], allowedMentions: { repliedUser: false } });
        }
    },
};