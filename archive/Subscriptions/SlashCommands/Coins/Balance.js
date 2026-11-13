const {
    Collection,
    Discord,
    createInvite,
    WebhookClient,
    PermissionsBitField,
    GatewayIntentBits,
    Partials,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    Events,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContextMenuCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const { SlashCommandBuilder } = require("@discordjs/builders");

const { Database } = require("st.db");
const BotMakerDB = new Database("./Database/BotMaker/Balance.json");
module.exports = {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Check bot's blanace.")
    ,
    ownerOnly: true,
    async run(client, interaction, language, reply, embeds) {
        try {
            const data = BotMakerDB.get(`SubscriptionData_${client.user.id}`) || null;

            interaction.reply(`My balance is: ${data?.Balance || 0}`);
           } catch (error) {
            console.log(error)
            return interaction.editReply({ embeds: [embeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};