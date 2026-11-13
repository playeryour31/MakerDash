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
const BotMakerDB = new Database("./Database/BotMaker/Data.json");
const coinsDB = new Database("./Database/BotMaker/Balance.json");
const blacklist = new Database("./Database/BotMaker/Blacklisted");


module.exports = {
    data: new SlashCommandBuilder()
        .setName('coins')
        .setDescription("View your balance or someone else's balance.")
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User to see their balance')
                .setRequired(false)
        ),
  ownerOnly: false,
    async run(client, interaction, language, reply, embeds) {
    try {
      const balanceSchema = require('../../../Schema/Balance');

      const userOption = interaction.options.getUser("user");
      const member = userOption ? userOption : interaction.user;

      let userdata = await balanceSchema.findOne({ userid: member.id, guild: interaction.guild.id })
      let usercoins = userdata?.balance || 0

      if (usercoins === 0 && member.id === interaction.user.id) {
        interaction.reply(`You dont have balance. use /buy-coins to buy`);
      } else if (member.id == interaction.user.id && usercoins != 0) {
        interaction.reply(`you have \`${usercoins}\` coins`);
      } else {
        interaction.reply(`${member.username} have \`${usercoins}\` coins`);
      }
   } catch (error) {
            console.log(error)
            return interaction.editReply({ embeds: [embeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};