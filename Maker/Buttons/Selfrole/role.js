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
} = require("discord.js");
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("selfrole")

module.exports = {
    name: "role",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            let roleid = interaction.customId.split("_")[0].trim()
            let role = interaction.guild.roles.cache.get(roleid)

            if(!role) return interaction.reply({content:`${reply.Selfrole.Reply7.replace("[ROLE]", role).replace("[ROLEID]", roleid)}`, ephemeral: true, allowedMentions: { repliedUser: false }})

            if (role.position >= interaction.guild.members.me.roles.highest.position)
            return interaction.reply({ content: reply.Selfrole.Reply8.replace("[ROLE]", role.name), ephemeral: true, allowedMentions: { repliedUser: false } })

            if(interaction.member.roles.cache.has(roleid)){
                interaction.member.roles.remove(roleid).then(() =>{
                    return interaction.reply({content:reply.Selfrole.Reply9.replace("[ROLE]", role), ephemeral: true, allowedMentions: { repliedUser: false }})
                }).catch(err =>{
                    return interaction.reply({content:reply.Selfrole.Reply11, ephemeral: true, allowedMentions: { repliedUser: false }})
                })
            }else if(!interaction.member.roles.cache.has(roleid)){
                interaction.member.roles.add(roleid).then(() =>{
                    return interaction.reply({content:reply.Selfrole.Reply10.replace("[ROLE]", role), ephemeral: true, allowedMentions: { repliedUser: false }})
                }).catch(err =>{
                    return interaction.reply({content:reply.Selfrole.Reply12, ephemeral: true, allowedMentions: { repliedUser: false }})
                })
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
