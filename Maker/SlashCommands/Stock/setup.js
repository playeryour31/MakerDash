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
    Message,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContextMenuCommandBuilder,
    SlashCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    ButtonStyle,
    PermissionOverwriteManager,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db");
const db = require("../../lib/featureDb")("stock_db");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Set up payment details (ProBot ID and Recipient ID).')
        .addUserOption(option =>
            option.setName('probot')
                .setDescription('Enter the ProBot ID.')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('recipient')
                .setDescription('Enter the Recipient ID.')
                .setRequired(true)
        ),
    type: "Stock",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    support: false,
    ownerOnly: true,

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async run(client, interaction, language, reply, replyEmbeds) {
 try {
            const probotUser = interaction.options.getUser('probot');
            const recipientUser = interaction.options.getUser('recipient');
            const guildId = interaction.guild.id;

            if (probotUser.id === recipientUser.id) {
                return interaction.reply({
                    content: reply.Stock.Reply29,
                    ephemeral: true,
                });
            }

            try {
                db.set(`paymentData_${interaction.guild.id}_${client.user.id}`, {
                    probotId: probotUser.id,
                    recipientId: recipientUser.id
                });


                interaction.reply({
                    content: reply.Stock.Reply30,
                    ephemeral: false,
                });

            } catch (dbError) {
                console.error("Database Error:", dbError);
                return interaction.reply({
                    content: reply.Stock.Reply31,
                    ephemeral: true,
                });
            }

       } catch (error) {
            console.error(error);
            interaction.reply({
                embeds: [replyEmbeds.errorEmbed],
                ephemeral: true,
                allowedMentions: { repliedUser: false },
            });
        }
    },
};
