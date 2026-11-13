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
const db = require("../../lib/featureDb")("ticket")

module.exports = {
    name: "select-option",
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
            const Type = interaction.values[0];
            const panal_channel = interaction.customId.split("_")[1].trim()
            const panal_category = interaction.customId.split("_")[2].trim()
            const button_name = interaction.customId.split("_")[3].trim()
            const button_color = interaction.customId.split("_")[4].trim()
            const support_role = interaction.customId.split("_")[5].trim()
            const msg = interaction.customId.split("_")[6].trim()

const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select-content_' + panal_channel + "_" + panal_category + "_" + button_name + "_"+ button_color + "_"+ support_role + "_" + msg.id + "_" + Type)
                .setPlaceholder(reply.Ticket.Reply47)
                .addOptions([
                    {
                        label: 'Message',
                        value: 'message',
                    },
                    {
                        label: 'Embed',
                        value: 'embed',
                    },
                ]);
            const selectMenuRow = new ActionRowBuilder().addComponents(selectMenu);

                   await interaction.update({
                content: reply.Ticket.Reply48,
                components: [selectMenuRow],
                ephemeral: false,
            });
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
}
