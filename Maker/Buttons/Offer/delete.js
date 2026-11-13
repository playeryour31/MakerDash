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
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("offer")

module.exports = {
    name: "ticketdelete",
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
            let CountsDB = interaction.customId.split("_")[0].trim();
            interaction.message.edit({components: []})
            const embed = new EmbedBuilder()
            .setColor(`Red`)
            .setDescription(reply.Ticket.Reply14)


const alreadyCreated = db.get(`alreadyCreated_${interaction.user.id}_${interaction.guild.id}`);
if (alreadyCreated) {
    db.delete(`alreadyCreated_${interaction.user.id}_${interaction.guild.id}`);
}


            interaction.channel.send({embeds: [embed]}).then(()=>{
                setTimeout(() => interaction.channel.delete().catch(err =>{}), 5000);
            })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
