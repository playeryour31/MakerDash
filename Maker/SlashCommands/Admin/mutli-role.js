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
        .setName('role-multiple')
        .setDescription('Give/Remove multiple users from a role.')
        .addStringOption(type => type
            .setName("give_or_remove")
            .setDescription("Pick a type.")
            .setRequired(true)
            .addChoices(
                { name: "Give", value: "give" },
                { name: "Remove", value: "remove" },
            ))
        .addRoleOption(role => role
            .setName("role")
            .setDescription("The role to give/remove.")
            .setRequired(true))

        .addStringOption(type => type
            .setName("pick_type")
            .setDescription("Pick a type.")
            .setRequired(true)
            .addChoices(
                { name: "All", value: "all" },
                { name: "Bots", value: "bots" },
                { name: "Humans", value: "humans" },
                { name: "All with role", value: "req_role" },
            ))

        .addRoleOption(role => role
            .setName("requiered_role")
            .setDescription("The requiered role.")
        )
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
            let action_type = interaction.options.getString("give_or_remove")
            let role = interaction.options.getRole("role")
            let action = interaction.options.getString("pick_type")
            let req_role = interaction.options.getRole("requiered_role")


            if (role.position >= interaction.member.roles.highest.position)
                return interaction.reply({ content: reply.System.Role1.replace("[ROLE]", role.name), ephemeral: true, allowedMentions: { repliedUser: false } })

            if (role.position >= interaction.guild.members.me.roles.highest.position)
                return interaction.reply({ content: reply.System.Role2.replace("[ROLE]", role.name), ephemeral: true, allowedMentions: { repliedUser: false } })



            if (action == "req_role" && !req_role)
                return interaction.reply({ content: reply.System.Role5, ephemeral: true, allowedMentions: { repliedUser: false } })


            let i = 0;
            let type = "+"
            if (action_type == "give") type = "+"
            else type = "-"
            let members = await interaction.guild.members.fetch()
            if (action == "all") {
                members.forEach(async member => {
                    if (interaction.guild.members.me.roles.highest.position <= member.roles.highest.position)
                    return
                    if (action_type == "give") {
                        member.roles.add(role.id)
                        i += 1
                    } else {
                        member.roles.remove(role.id)
                        i += 1
                    }
                })
            } else if (action == "bots") {
                members.forEach(async member => {
                    if (interaction.guild.members.me.roles.highest.position <= member.roles.highest.position)
                    return
                    if (!member.user.bot) return
                    if (action_type == "give") {
                        member.roles.add(role.id)
                        i += 1
                    } else {
                        member.roles.remove(role.id)
                        i += 1
                    }
                })
            } else if (action == "humans") {
                members.forEach(async member => {
                    if (interaction.guild.members.me.roles.highest.position <= member.roles.highest.position)
                    return
                    if (member.user.bot) return
                    if (action_type == "give") {
                        member.roles.add(role.id)
                        i += 1
                    } else {
                        member.roles.remove(role.id)
                        i += 1
                    }
                })
            } else if (action == "req_role") {
                members.forEach(async member => {
                    if (interaction.guild.members.me.roles.highest.position <= member.roles.highest.position)
                    return
                    if (!member.roles.cache.has(req_role.id)) return
                    if (action_type == "give") {
                        member.roles.add(role.id)
                        i += 1
                    } else {
                        member.roles.remove(role.id)
                        i += 1
                    }
                })
            }

            await interaction.reply(
                {
                    embeds: [new EmbedBuilder().setDescription(reply.System.Role6.replace("[NUMBER]", i).replace("[TYPE]", type).replace("[ROLE]", role.name)).setColor("Green")],
                    allowedMentions: { repliedUser: false }
                })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};