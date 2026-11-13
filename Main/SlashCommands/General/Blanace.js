const { 
    Collection, 
    WebhookClient, 
    PermissionsBitField, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");  
const { SlashCommandBuilder } = require("@discordjs/builders"); 
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));  

const Tokens = new Database("/Database/Others/BotMakerTokens.json");
const BotMakerDB = new Database("./Database/BotMaker/Balance.json");

module.exports = {  
    data: new SlashCommandBuilder()     
        .setName("balance")     
        .setDescription("Recharge a bot balance")
        .addStringOption(option =>
            option.setName('bot-id')
                .setDescription('The bot to charge')
                .setRequired(true)
        ),
        
    ownerOnly: false,  

    async run(client, interaction) {
        const { Blacklist } = require("../../../Schema/Blacklist");
        const isBlacklisted = await Blacklist.findOne({ UserID: interaction.user.id });
        if (isBlacklisted) {
            return interaction.reply({
                content: `You are blacklisted.`,
                ephemeral: true,
            });
        }

        const botID = interaction.options.getString('bot-id');

        const bots = Tokens.get('Subscriptions') || [];
        const Bots = bots.filter(bot => bot.ClientID === botID);

        if (Bots.length === 0) {
            return interaction.reply({ content: 'You do not own any Subscriptions.', ephemeral: true });
        }

        if (!Bots[0].Owner.includes(interaction.user.id)) { 
            return interaction.reply({ content: 'You do not own that subscription.', ephemeral: true });
        }

        const data = BotMakerDB.get(`SubscriptionData_${Bots[0].ClientID}`) || { Balance: 0 };
        console.log(data);

        const rechargeButton = new ButtonBuilder()
            .setCustomId('recharge_' + Bots[0].ClientID)
            .setLabel('Recharge')
            .setStyle(ButtonStyle.Secondary);

        const actionRows = new ActionRowBuilder().addComponents(rechargeButton);

        const embed = new EmbedBuilder()
            .setColor('#ffffff')
            .setDescription(`## Bot Balance\n**Your Bot Balance is:** ${data.Balance || 0}`);

        const message = await interaction.reply({
            embeds: [embed],
            components: [actionRows],
            ephemeral: false
        });
    },
};