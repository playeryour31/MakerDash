const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const Tokens = new Database("/Database/Others/Tokens.json");
const Colors = require("../../Resources/Colors.json");
const calculateDuration = require("../../Functions/calculateDuration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("Purchase Bots Panel")
    .addSubcommand(subcommand =>
      subcommand
        .setName('bots')
        .setDescription('Show all bots the user owns.')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check')
            .setRequired(true))
    ),

  ownerOnly: true,

  async run(client, interaction) {
     try {
      const User = interaction.options.getUser('user');
      const bots = Tokens.get('Bots') || [];
      const userBots = bots.filter(bot => bot.Owner === User.id);

      if (userBots.length === 0) {
        return interaction.reply({ content: `**${User.tag}** does not own any bots.`, ephemeral: true });
      }

      let page = 0;
      const pageSize = 3;
      const totalPages = Math.ceil(userBots.length / pageSize);

      const generateEmbed = async (page) => {
        const start = page * pageSize;
        const end = start + pageSize;
        const botsOnPage = userBots.slice(start, end);

        const embedDescription = await Promise.all(botsOnPage.map(async (bot, index) => {
          const TheBot = await client.users.fetch(bot.ClientID).catch(() => bot.ClientID);

          const starttime = bot.startTime;
          const endtime = bot.endTime;
          const remainingTime = calculateDuration(starttime, endtime) || "N/A";

          return `**${start + index + 1}. ${TheBot.username || "Unknown"}**\n` +
            `> **Type:** ${bot.Type || "N/A"}\n` +
            `> **ClientID:** ${bot.ClientID || "N/A"}\n` +
            `> **Price:** ${bot.Price ? `${bot.Price} Coins` : "N/A"}\n` +
            `> **Remaining Time:** ${remainingTime}`;
        }));

        const embed = new EmbedBuilder()
          .setTitle(`Bots Owned by ${User.tag}`)
          .setColor(Colors.Main)
          .setDescription(embedDescription.join("\n\n"))
          .setFooter({ text: `Page ${page + 1} of ${totalPages}` });

        return embed;
      };

      const generateButtons = (page) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('previous')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages - 1)
        );
      };

      const message = await interaction.reply({
        embeds: [await generateEmbed(page)],
        components: [generateButtons(page)],
        ephemeral: false,
        fetchReply: true
      });

      const collector = message.createMessageComponentCollector({
        time: 5 * 60 * 1000
      });

      collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          return buttonInteraction.reply({ content: "You cannot interact with this message.", ephemeral: true });
        }

        if (buttonInteraction.customId === 'previous' && page > 0) {
          page--;
        } else if (buttonInteraction.customId === 'next' && page < totalPages - 1) {
          page++;
        }

        await buttonInteraction.update({
          embeds: [await generateEmbed(page)],
          components: [generateButtons(page)],
        });
      });

      collector.on('end', async () => {
        await message.edit({
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            )
          ]
        });
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: "An error occurred while fetching the bots.", ephemeral: true });
    }
  },
};