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
    REST,
    Routes,
    GatewayCloseCodes,
    ButtonStyle,
    PermissionOverwriteManager,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    name: "hide-all",
    type: "System",
    botP: [PermissionFlagsBits.ManageChannels],
    userP: [PermissionFlagsBits.ManageChannels],
    P: "ManageChannels",
    ownerOnly: false,

    async run(client, message, args, language, reply, replyEmbeds, name) {
        try {
            const channels = message.guild.channels.cache.filter(ch => ch.type !== ChannelType.GuildCategory);

            let hiddenChannels = 0;
            let alreadyHiddenChannels = 0;

            for (const channel of channels.values()) {
                const everyoneperms = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
                if (everyoneperms?.deny?.toArray()?.includes("ViewChannel")) {
                    alreadyHiddenChannels++;
                    continue;
                }

                await channel.permissionOverwrites.edit(message.guild.id, { ViewChannel: false });
                hiddenChannels++;
            }

            let replyMessage;
            if (hiddenChannels === 0 && alreadyHiddenChannels > 0) {
                replyMessage = reply.System.Hide2.replace("[ROOM]", "all channels");
            } else {
                replyMessage = reply.System.Hide1.replace("[ROOM]", "all channels");
            }

            await message.reply({
                content: replyMessage,
                allowedMentions: { repliedUser: false }
            });

        } catch (error) {
            console.log(error);
            return message.reply({ embeds: [replyEmbeds.errorEmbed], allowedMentions: { repliedUser: false } });
        }
    },
};
