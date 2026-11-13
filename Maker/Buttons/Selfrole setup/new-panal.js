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
    name: "new-selfrole",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const channel = interaction.customId.split("_")[0].trim()
            const role = interaction.customId.split("_")[1].trim()
            const type = interaction.customId.split("_")[2].trim()

            let CustomId;
            if(type == "button"){
                CustomId = channel + "_" + role + "_" + type + "_" + "true" + "_" + 1 + "_selfrolepanal"
            }else{
                CustomId = channel + "_" + role + "_" + type + "_" + "true" + "_selfrolepanal"
            }
            const modal = new ModalBuilder()
                .setCustomId(CustomId)
                .setTitle(reply.Selfrole.Setup.modal.t);

            const input1 = new TextInputBuilder()
                .setCustomId('name')
                .setRequired(true)
                .setLabel(reply.Selfrole.Setup.modal.input1)
                .setPlaceholder(reply.Selfrole.Setup.modal.place1)
                .setMaxLength(20)
                .setStyle(TextInputStyle.Short);

            const the_input1 = new ActionRowBuilder().addComponents(input1);



            modal.addComponents(the_input1);

            await interaction.showModal(modal);
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
