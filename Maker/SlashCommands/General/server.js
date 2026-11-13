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
        .setName('server')
        .setDescription('Display information about the server.')

    ,
    type: "General",
    botP: [],
    userP: [],
    P: ""
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const verificationLevels = {
                NONE: "0",
                LOW: "1",
                MEDIUM: "2",
                HIGH: "3",
                VERY_HIGH: "4",
            };
            let on =
                interaction.guild.presences.cache.filter((e) => e.status == "online")
                    .size - 1 || 0;
            let idle =
                interaction.guild.presences.cache.filter((e) => e.status == "idle").size +
                1 || 0;
            let dnd =
                interaction.guild.presences.cache.filter((e) => e.status == "dnd").size ||
                0;
            var embed = new EmbedBuilder()
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .addFields([
                    {
                        name: `:id: Server ID: `,
                        value: `**${interaction.guild.id}**`,
                    },
                    {
                        name: `:date: Created On: `,
                        value: `**<t:${parseInt(interaction.guild.createdAt / 1000)}:R>**`,
                    },
                    {
                        name: `:crown: Owned by: `,
                        value: `**${await interaction.guild.fetchOwner()}**`,
                    },
{
    name: `:busts_in_silhouette: Members (${interaction.guild.memberCount})`,
    value: `**${interaction.guild.presences.cache.filter(p => p.status !== "offline").size} Online**\n` +
           `**${interaction.guild.members.cache.filter(m => m.user.bot).size} Bots**`,
},
{
    name: `:speech_balloon: Channels (${interaction.guild.channels.cache.size})`,
    value: `**${interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size}** Text | ` +
           `**${interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size}** Voice\n` +
           `**${interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size}** Category | ` +
           `**${interaction.guild.channels.cache.filter(c => 
               c.type === ChannelType.PublicThread || 
               c.type === ChannelType.PrivateThread || 
               c.type === ChannelType.AnnouncementThread).size}** Threads`,
},
{
    name: `:earth_africa: Others:`,
    value: `**Verification Level:** ${interaction.guild.verificationLevel}\n` +
           `**Boosts:** ${interaction.guild.premiumSubscriptionCount} ✨\n` +
           `**Boost Level:** ${interaction.guild.premiumTier}`,
},
                    {
                        name: `🌟 Roles:(${interaction.guild.roles.cache.size})`,
                        value: `**More roles info use /roles**`,
                    },
                ])
                .setColor(interaction.guild.members.me.displayColor)
                .setAuthor({ name: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });
            interaction.reply({ embeds: [embed] })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};