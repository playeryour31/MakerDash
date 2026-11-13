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
const db = require("../../lib/featureDb")("ticket")
const db2 = require("../../lib/featureDb")("temp_ticket")

module.exports = {
    name: "request-accept",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const requester = interaction.customId.split("_")[0].trim();
            let claimer = db2.get(interaction.channel.id + "_claimed")

            if (claimer && interaction.user.id != claimer && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) 
            return interaction.reply({ content: reply.Ticket.Reply40, ephemeral: true })

            interaction.deferUpdate();

            const embed = new EmbedBuilder()
            .setColor("Green")
            .setDescription(interaction.message.embeds[0].description)

            const Requestbuttons = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId(requester + "_request-accept")
                    .setStyle(ButtonStyle.Success)
                    .setLabel("Accept")
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(requester + "_request-reject")
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Reject")
                    .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(requester + "_requester-remove")
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Remove")
                        .setDisabled(false),
            ]);
            interaction.message.edit({embeds: [embed], components: [Requestbuttons] }).then(() =>{
                interaction.channel.permissionOverwrites.edit(requester, { SendMessages: true, });
                interaction.channel.send({content: `<@!${requester}>`}).then(async (mm) =>{
                    setTimeout(() =>{
                        mm.delete().catch(err =>{})
                    },1000)
                })
            })

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
