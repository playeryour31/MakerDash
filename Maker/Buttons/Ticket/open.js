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
    PermissionOverwrites,
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("ticket")
const db2 = require("../../lib/featureDb")("temp_ticket")

module.exports = {
    name: "ticket_open",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            interaction.deferUpdate();
            interaction.message.delete().catch(err => { })
            const permissionOverwrites = interaction.channel.permissionOverwrites.cache;

            permissionOverwrites.forEach((permission, id) => {
                if (permission instanceof PermissionOverwrites && permission.type === 0) {
                    const role = interaction.channel.guild.roles.cache.get(id);
                    if (role.name === "@everyone") return
                    interaction.channel.permissionOverwrites.edit(interaction.channel.topic, {
                        ViewChannel: true,
                        SendMessages: true
                    });
                    interaction.channel.permissionOverwrites.edit(role.id, {
                        SendMessages: true
                    });
                }
            })

            const embed = new EmbedBuilder()
            .setColor('Green')
            .setDescription(reply.Ticket.Reply13.replace("[USER]", interaction.user))

            interaction.channel.send({embeds: [embed]})
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
