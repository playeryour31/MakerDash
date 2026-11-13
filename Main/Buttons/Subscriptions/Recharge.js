const {
    Client,
    Collection,
    Discord,
    createInvite,
    ChannelType,
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
    SlashCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
} = require("discord.js");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const Tokens = new Database("/Database/Others/BotMakerTokens.json");

module.exports = {
    name: "recharge",
    ownerOnly: false,
    run: async (client, interaction, args, config) => {
        try {
            const balanceSchema = require('../../../Schema/Balance');
            const bots = Tokens.get('Subscriptions') || [];
            const botid = interaction.customId.split("_")[1]?.trim();
            const Bots = bots.filter(bot => bot.ClientID === botid);

            if (!Bots[0].Owner.includes(interaction.user.id)) { 
                return interaction.reply({ content: 'You do not own that subscription.', ephemeral: true });
            }

            const userBalance = await balanceSchema.findOne({
                userid: interaction.user.id,
                guild: interaction.guild.id,
            });

            const coins = userBalance?.balance || 0;

            if (coins === 0) {
                return interaction.reply({ content: 'You do not own any coins.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId(`recharge-modal_${botid}`)
                .setTitle("Recharge Balance");

            const coinsInput = new TextInputBuilder()
                .setCustomId("coins_input")
                .setLabel("Enter the number of coins to recharge")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`Balance: ${coins} = ${coins} in your bot`)
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(coinsInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.log(error);
        }
    },
};