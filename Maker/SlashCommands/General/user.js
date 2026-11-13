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
const moment = require('moment-timezone');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Display infromtion about member.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("The user to get infromtion about."))
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
            const userOption = interaction.options.getUser("user");
            const member = userOption ? userOption : interaction.user;

            let embed = new EmbedBuilder()

                .addFields({
                    name: `Username :`,
                    value: `${member.username}`,
                    inline: true,
                })

                .addFields({
                    name: `Tag :`,
                    value: `${member.discriminator}`,
                    inline: true,
                })

                .addFields({ name: `User id :`, value: `${member.id}`, inline: true })

                .addFields({
                    name: `Nickname :`,
                    value: interaction.guild.members.cache.find((e) => e.id == member.id)
                        .nickname
                        ? interaction.guild.members.cache.find((e) => e.id == member.id)
                            .nickname
                        : member.username,
                    inline: true,
                })

                .addFields({
                    name: `Bot :`,
                    value: member.bot ? "true" : "false",
                    inline: true,
                })

                .addFields({
                    name: `Joined Discord :`,
                    value: `${moment(member.createdAt)
                        .toString()
                        .substr(0, 15)} | ${moment(member.createdAt).fromNow()}`,
                    inline: true,
                })

                .addFields([
                    {
                        name: `Joined Server :`,
                        value: `${moment(member.joinedAt).toString().substr(0, 15)}`,
                        inline: true,
                    },
                ])

                .setColor(interaction.guild.members.me.displayColor)
                .setAuthor(
                    {
                        name: `${member.tag}`,
                        iconURL: member.displayAvatarURL({ dynamic: true })
                    }
                )
                .setThumbnail(member.displayAvatarURL({ dynamic: true }))

                .setFooter(
                    {
                        text: `Requested by ${interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    }
                );

            interaction.reply({ embeds: [embed] })

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};