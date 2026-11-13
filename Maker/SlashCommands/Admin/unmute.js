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
const ms = require("ms");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Mute a member from text channels so they cannot type.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("User to mute.")
            .setRequired(true))
        .addStringOption(time => time
            .setName("time")
            .setDescription("Time duration for the mute."))
    ,
    type: "System",
    botP: [PermissionFlagsBits.Administrator],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let user = interaction.options.getUser("user")
            let time = interaction.options.getString("time") || '24h'

            const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => { });
            if (!member)
                return interaction
                    .reply({
                        content: reply.NotFound.Reply2,
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            if (member.id === interaction.member.id)
                return interaction
                    .reply({
                        content: reply.Others.Reply7.replace("[COMMAND]", "mute").replace("[AUTHOR]", interaction.user.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })


            if (
                interaction.member.roles.highest.position <= member.roles.highest.position
            )
                return interaction
                    .reply({
                        content: reply.Others.Reply7.replace("[COMMAND]", "mute").replace("[AUTHOR]", member.user.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            let muteRole = interaction.guild.roles.cache.find(
                (role) => role.name == "Muted"
            );
            if (!member.roles.cache.some((role) => role.name == "Muted")) {
                interaction
                    .reply({ content: reply.System.UnMute2.replace("[USER]", member.user.username), ephemeral: true, allowedMentions: { repliedUser: false } })

            } else {
                member.roles.remove(muteRole);
                interaction
                    .reply({
                        content: reply.System.UnMute3.replace("[USER]", member.user.username),
                        allowedMentions: { repliedUser: false }
                    })

            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};