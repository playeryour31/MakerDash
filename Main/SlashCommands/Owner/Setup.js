const {
  Client,
  Collection,
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
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { ChannelType } = require("discord-api-types/v9");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));

const BotMakerDB = new Database("/Database/BotMaker/Data.json");
const botPrices = new Database("/Database/BotMaker/Prices.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Setup BotMaker system")
    .addChannelOption(c => c
      .setName('channel')
      .setDescription(`The channel where the BotMaker ticket will be sent.`)
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
    )
    .addChannelOption(c => c
      .setName('sell-logs')
      .setDescription(`Select the sell logs channel`)
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
    )
    .addRoleOption(c => c
      .setName('role')
      .setDescription(`The role which the buyer will get after purchasing`)
      .setRequired(true)
    )
    .addUserOption(u => u
      .setName('bank')
      .setDescription('Select the bank account')
      .setRequired(true))
    .addUserOption(u => u
      .setName('probot')
      .setDescription('Select the ProBot account')
      .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  ownerOnly: true,

  async run(client, interaction) {
    try {
      const channel = interaction.options.getChannel('channel');
      const sellslog = interaction.options.getChannel('sell-logs').id;
      const role = interaction.options.getRole('role').id;
      const bank = interaction.options.getUser('bank').id;
      const probot = interaction.options.getUser('probot').id;

      BotMakerDB.set(`BotMakerData_${interaction.guild.id}`, {
        channel: channel.id,
        sellslog: sellslog,
        role: role,
        bank: bank,
        probot: probot
      });

      const successEmbed = new EmbedBuilder()
        .setTitle("<:What:1391921872349954159> BotMaker System Setup Completed")
        .setDescription(`The system has been successfully set up for your server.`)
        .addFields(
          { name: "Ticket Channel", value: `<#${channel.id}>`, inline: true },
          { name: "Sell Logs Channel", value: `<#${sellslog}>`, inline: true },
          { name: "Role", value: `<@&${role}>`, inline: true },
          { name: "Bank Account", value: `<@${bank}>`, inline: true },
          { name: "ProBot Account", value: `<@${probot}>`, inline: true }
        )
        .setColor("#ffffff");

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });

    } catch (error) {
      console.error("Error executing this command:", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription(`There was an error while setting up the BotMaker system. Please try again later.`)
        .setColor("#FF0000");

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
