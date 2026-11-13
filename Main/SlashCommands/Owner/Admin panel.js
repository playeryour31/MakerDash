const {
  Collection,
  WebhookClient,
  PermissionsBitField,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder 
} = require("discord.js");

const { SlashCommandBuilder } = require("@discordjs/builders");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));

const tokens = new Database("/Database/Others/UnusedTokens.json");
const Ontokens = new Database("/Database/Others/Tokens.json");
const botPrices = new Database("/Database/BotMaker/Prices.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Purchase Bots Panel")
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('Access the Admins Manage Configurations')
        .addChannelOption(option => option.setName('channel').setDescription('The Channel'))
    ),

  ownerOnly: true,
  async run(client, interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    let embed = new EmbedBuilder()
      .setTitle("Maker Manage")
      .setDescription("Select an option to manage.")
      .setColor('#ffffff');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('admin-select')
      .setPlaceholder('Select an option...')
      .addOptions(
        {
          label: 'Find User',
          value: 'find-user',
          description: 'Get information about the user.'
        },
        {
          label: 'Find Bot',
          value: 'find-bot',
          description: 'Get information about the bot.'
        },
        {
          label: 'Tokens Manager',
          value: 'tokens',
          description: 'Manage unused tokens.'
        },
        {
          label: 'Prices List',
          value: 'prices-list',
          description: 'View the bot prices list.'
        },
        {
          label: 'Top Coins Holders',
          value: 'top-coins',
          description: 'View the top coin holders.'
        },
        {
          label: 'Top bots Holders',
          value: 'top-bots',
          description: 'View the top bots holders.'
        }


      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
