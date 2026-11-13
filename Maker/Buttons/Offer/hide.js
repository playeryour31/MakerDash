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
const db = require("../../lib/featureDb")("offer")

module.exports = {
    name: "offerhide",
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
                        ViewChannel: false
                    });
                    interaction.channel.permissionOverwrites.edit(role.id, {
                        SendMessages: false
                    });
                }
            })
            let CountsDB = interaction.customId.split("_")[0].trim();
         //  console.log(CountsDB)

            const Ticketbuttons = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId(`${CountsDB}_ticketdelete`)
                    .setStyle(ButtonStyle.Danger)
                    .setLabel("Delete")
                    .setDisabled(false),
                new ButtonBuilder()
                    .setCustomId(`${CountsDB}_ticketopen`)
                    .setStyle(ButtonStyle.Success)
                    .setLabel("Open")
                    .setDisabled(false),
                new ButtonBuilder()
                    .setCustomId(`${CountsDB}_tickettranscript`)
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Transcript")
                    .setDisabled(false),
            ]);
const alreadyCreated = db.get(`alreadyCreated_${interaction.user.id}_${interaction.guild.id}`);
if (alreadyCreated) {
    db.delete(`alreadyCreated_${interaction.user.id}_${interaction.guild.id}`);
}

            const embed1 = new EmbedBuilder()
                .setColor("Yellow")
                .setDescription(reply.Ticket.Reply12.replace("[USER]", interaction.user))

            const embed2 = new EmbedBuilder()
                .setColor("DarkButNotBlack")
                .setDescription(reply.Ticket.Reply11)
            interaction.channel.send({ embeds: [embed1, embed2] , components:[Ticketbuttons] })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
