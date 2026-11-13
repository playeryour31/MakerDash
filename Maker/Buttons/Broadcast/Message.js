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
    ChatInputCommandInteraction,
} = require("discord.js");
const { Database } = require("st.db")
const db = new Database("./Maker/Json-Database/Settings/Apply.json")

module.exports = {
    name: "message",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: true,
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {string} messageId - The ID of the message that was clicked
     */
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
        const messageId = interaction.message.id; // Get the message ID

const modal = new ModalBuilder()
            .setCustomId(`setmessages`) // استخدام المعرف الصحيح هنا
            .setTitle(`Set ${interaction.user.username}'s Message`);

        const messageInput = new TextInputBuilder()
            .setCustomId(`message_${messageId}`) // استخدم ID الرسالة
            .setLabel('Enter your message')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
            const row = new ActionRowBuilder().addComponents(messageInput);

            modal.addComponents(row);

            await interaction.showModal(modal,messageId);
            console.log(messageId);

        } catch (error) {
            console.log(error);
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    },
};