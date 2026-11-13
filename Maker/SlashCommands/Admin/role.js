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
        .setName('role')
        .setDescription('Give/Remove role to/from a user.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("Target user.")
            .setRequired(true))
        .addRoleOption(role => role
            .setName("role")
            .setDescription("The role.")
            .setRequired(true))
    ,
    type: "System",
    botP: [PermissionFlagsBits.ManageRoles],
    userP: [PermissionFlagsBits.ManageRoles],
    P: "ManageRoles"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let user = interaction.options.getUser("user")
            let role = interaction.options.getRole("role")

            let member = interaction.guild.members.cache.get(user.id)


            if (!member)
                return interaction
                    .reply({
                        content: reply.NotFound.Reply2,
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            if (role.position >= interaction.member.roles.highest.position)
                return interaction.reply({ content: reply.System.Role1.replace("[ROLE]", role.name), ephemeral: true, allowedMentions: { repliedUser: false } })

            if (role.position >= interaction.guild.members.me.roles.highest.position)
                return interaction.reply({ content: reply.System.Role2.replace("[ROLE]", role.name), ephemeral: true, allowedMentions: { repliedUser: false } })

            if (interaction.member.roles.highest.position <= member.roles.highest.position)
                return interaction.reply({ content: reply.System.Role1.replace("[ROLE]", role.name), ephemeral: true, allowedMentions: { repliedUser: false } })


            if (!member.roles.cache.has(role.id)) {
                member.roles.add(role.id)
                let embed = new EmbedBuilder()
                .setColor("Green")
                .setDescription(reply.System.Role3.replace("[ROLES]", "+" + role.name).replace("[USER]", member.user.username))
                return interaction.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
            } else {
                member.roles.remove(role.id)
                let embed = new EmbedBuilder()
                .setColor("Green")
                .setDescription(reply.System.Role3.replace("[ROLES]", "-" + role.name).replace("[USER]", member.user.username))
                return interaction.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
            }

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};