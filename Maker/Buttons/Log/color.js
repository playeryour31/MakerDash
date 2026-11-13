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
const db = require("../../lib/featureDb")("sys_log")

module.exports = {
    name: "logcolor",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            let event = interaction.customId.split("_")[0].trim()

            const modal = new ModalBuilder()
            .setCustomId(event + "_logcolor")
            .setTitle(reply.Log.Reply18);


                const input = new TextInputBuilder()
                    .setCustomId("color")
                    .setRequired(true)
                    .setLabel(reply.Log.Reply18)
                    .setMaxLength(9)
                    .setStyle(TextInputStyle.Short);

                const inp1 = new ActionRowBuilder().addComponents(input);
            
                modal.addComponents(inp1);
            
            await interaction.showModal(modal);
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
