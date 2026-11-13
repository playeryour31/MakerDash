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
        .setName('lock')
        .setDescription('Disable @everyone from sending messages in specific channel.')
            .addChannelOption(channel => channel
                .setName("channel")
                .setDescription("Channel to lock."))
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
            let channel = interaction.options.getChannel("channel") || interaction.channel

            const everyoneperms = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);
            if(everyoneperms?.deny?.toArray()?.includes("SendMessages")){
                interaction.reply({content: reply.System.Lock2.replace("[ROOM]",channel), ephemeral: true, allowedMentions: { repliedUser: false } })
                return
            }

            channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false }).then(() => {
                interaction
                    .reply({
                        content: reply.System.Lock1.replace("[ROOM]", channel),
                        allowedMentions: { repliedUser: false }
                    })
            });
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};