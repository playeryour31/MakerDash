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
const db = require("../../lib/applyDb")
module.exports = {
    name: "new-application",
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
            const requests = interaction.customId.split("_")[1].trim()
            const role = interaction.customId.split("_")[2].trim()

            const modal = new ModalBuilder()
            .setCustomId(channel + "_" + requests + "_" + role + "_" + "false" + "_application")
            .setTitle(reply.Apply.Asks.t);

        const ask1 = new TextInputBuilder()
            .setCustomId('ask1')
            .setRequired(true)
            .setLabel(reply.Apply.Asks.q1)
            .setMaxLength(45)
            .setStyle(TextInputStyle.Short);


        const ask2 = new TextInputBuilder()
            .setCustomId('ask2')
            .setLabel(reply.Apply.Asks.q2)
            .setRequired(false)
            .setMaxLength(45)

            .setStyle(TextInputStyle.Short);

        const ask3 = new TextInputBuilder()
            .setCustomId('ask3')
            .setLabel(reply.Apply.Asks.q3)
            .setRequired(false)
            .setMaxLength(45)

            .setStyle(TextInputStyle.Short);

        const ask4 = new TextInputBuilder()
            .setCustomId('ask4')
            .setLabel(reply.Apply.Asks.q4)
            .setRequired(false)
            .setMaxLength(45)

            .setStyle(TextInputStyle.Short);

        const ask5 = new TextInputBuilder()
            .setCustomId('ask5')
            .setLabel(reply.Apply.Asks.q5)
            .setRequired(false)
            .setMaxLength(45)

            .setStyle(TextInputStyle.Short);



        const the_ask1 = new ActionRowBuilder().addComponents(ask1);
        const the_ask2 = new ActionRowBuilder().addComponents(ask2);
        const the_ask3 = new ActionRowBuilder().addComponents(ask3);
        const the_ask4 = new ActionRowBuilder().addComponents(ask4);
        const the_ask5 = new ActionRowBuilder().addComponents(ask5);


        modal.addComponents(the_ask1, the_ask2, the_ask3, the_ask4, the_ask5);

        await interaction.showModal(modal);
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
