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
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContextMenuCommandBuilder,
    SlashCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    RoleSelectMenuBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db");

module.exports = {
    name: "selfrolemenu",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            let roleid = interaction.values[0];
            let role = interaction.guild.roles.cache.get(roleid)

            if (!role) return interaction.reply({ content: `${reply.Selfrole.Reply7.replace("[ROLE]", role).replace("[ROLEID]", roleid)}`, ephemeral: true, allowedMentions: { repliedUser: false } })

            if (role.position >= interaction.guild.members.me.roles.highest.position)
                return interaction.reply({ content: reply.Selfrole.Reply8.replace("[ROLE]", role.name), ephemeral: true, allowedMentions: { repliedUser: false } })

            if (interaction.member.roles.cache.has(roleid)) {
                interaction.member.roles.remove(roleid).then(() => {
                    return interaction.reply({ content: reply.Selfrole.Reply9.replace("[ROLE]", role), ephemeral: true, allowedMentions: { repliedUser: false } })
                }).catch(err => {
                    return interaction.reply({ content: reply.Selfrole.Reply11, ephemeral: true, allowedMentions: { repliedUser: false } })
                })
            } else if (!interaction.member.roles.cache.has(roleid)) {
                interaction.member.roles.add(roleid).then(() => {
                    return interaction.reply({ content: reply.Selfrole.Reply10.replace("[ROLE]", role), ephemeral: true, allowedMentions: { repliedUser: false } })
                }).catch(err => {
                    return interaction.reply({ content: reply.Selfrole.Reply12, ephemeral: true, allowedMentions: { repliedUser: false } })
                })
            }
            setTimeout(() => {
                interaction.message.edit({ components: [interaction.message.components[0]] })
            }, 1500)
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
}
