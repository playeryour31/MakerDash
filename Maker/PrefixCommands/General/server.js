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
} = require("discord.js");

module.exports = {
    name: "server",
    type: "General",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            const verificationLevels = {
                NONE: "0",
                LOW: "1",
                MEDIUM: "2",
                HIGH: "3",
                VERY_HIGH: "4",
              };
              let on =
                message.guild.presences.cache.filter((e) => e.status == "online")
                  .size - 1 || 0;
              let idle =
                message.guild.presences.cache.filter((e) => e.status == "idle").size +
                  1 || 0;
              let dnd =
                message.guild.presences.cache.filter((e) => e.status == "dnd").size ||
                0;
              var embed = new EmbedBuilder()
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .addFields([
                  {
                    name: `:id: Server ID: `,
                    value: `**${message.guild.id}**`,
                  },
                  {
                    name: `:date: Created On: `,
                    value: `**<t:${parseInt(message.guild.createdAt / 1000)}:R>**`,
                  },
                  {
                    name: `:crown: Owned by: `,
                    value: `**${await message.guild.fetchOwner()}**`,
                  },
                {
                    name: `:busts_in_silhouette: Members (${message.guild.memberCount})`,
    value: `**${message.guild.presences.cache.filter(p => p.status !== "offline").size} Online**\n` +
           `**${message.guild.members.cache.filter(m => m.user.bot).size} Bots**`,
                },
                  {
                    name: `:speech_balloon: Channels: (${message.guild.channels.cache.size})`,
    value: `**${message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size}** Text | ` +
           `**${message.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size}** Voice\n` +
           `**${message.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size}** Category | ` +
           `**${message.guild.channels.cache.filter(c => 
               c.type === ChannelType.PublicThread || 
               c.type === ChannelType.PrivateThread || 
               c.type === ChannelType.AnnouncementThread).size}** Threads`,
},
                    {
    name: `:earth_africa: Others:`,
    value: `**Verification Level:** ${message.guild.verificationLevel}\n` +
           `**Boosts:** ${message.guild.premiumSubscriptionCount} ✨\n` +
           `**Boost Level:** ${message.guild.premiumTier}`,
},
                  {
                    name: `🌟 Roles:(${message.guild.roles.cache.size})`,
                    value: `**More roles info use /roles**`,
                  },
                ])
                .setColor(message.guild.members.me.displayColor)
                .setAuthor({name:`${message.guild.name}`,iconURL: message.guild.iconURL()});
              message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};