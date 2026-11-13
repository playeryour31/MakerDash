const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");
const { Database } = require("st.db");
const ConfigDB = new Database("./Subscriptions/Database/Makers/Messages");
const Config = require('../../../Main/Resources/Config');
const bots = require('../../../Main/Resources/Bots');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("Main")
    .setDescription("Send the bot's panels with custom messages and images.")
    .addSubcommand(subcommand => 
      subcommand.setName('panel')
        .setDescription("Send the bot selling panel with custom messages and images.")
        .addStringOption(option =>
          option
            .setName("message-type")
            .setDescription("Select the message format type.")
            .setRequired(false)
            .addChoices(
              { name: "Embed", value: "embed" },
              { name: "Content", value: "content" },
              { name: "Images Only", value: "imageonly" },
              { name: "Components Only", value: "components" }
            )
        )
        .addStringOption(option =>
          option
            .setName("bot-description")
            .setDescription("Allow or Disallow bot description in the message.")
            .setRequired(false)
            .addChoices(
              { name: "Allow", value: "Allow" },
              { name: "DisAllow", value: "DisAllow" }
            )
        )
        .addAttachmentOption(option =>
          option
            .setName("image")
            .setDescription("Upload an image to include in the message.")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("message")
            .setDescription("Enter a custom message to send with the panel.")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("info-button-message")
            .setDescription("Message displayed when clicking the info button.")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("info-button-name")
            .setDescription("Enter a name for the info button.")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("button-style")
            .setDescription("Select the button color.")
            .setRequired(false)
            .addChoices(
              { name: "Primary", value: "Primary" },
              { name: "Secondary", value: "Secondary" },
              { name: "Success", value: "Success" },
              { name: "Danger", value: "Danger" }
            )
        )
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Select a channel to send the panel message to.")
            .setRequired(false)
        )),
        
  botP: [PermissionFlagsBits.Administrator],
  P: "Administrator",
  ownerOnly: true,
  cooldown: 10000,

    async run(client, interaction, language, reply, embeds) {
    try {
      const channel = interaction.options.getChannel("channel") || interaction.channel;
      const messageType = interaction.options.getString("message-type") || "embed";
      let customMessage = interaction.options.getString("message") || "## Maker Panel";
      const image = interaction.options.getAttachment("image");
      const infoButtonMessage = interaction.options.getString("info-button-message") || "Normal";
      const infoButtonName = interaction.options.getString("info-button-name");
      const buttonStyleChoice = interaction.options.getString("button-style") || "Secondary";
      const botDescription = interaction.options.getString("bot-description") || "Allow";

      if (messageType === "imageonly" && !image) {
        return interaction.reply({
          content: "You must attach an image when selecting Images Only.",
          ephemeral: true
        });
      }

      const buttonStyles = {
        Primary: ButtonStyle.Primary,
        Secondary: ButtonStyle.Secondary,
        Success: ButtonStyle.Success,
        Danger: ButtonStyle.Danger
      };

      const botOptions = Object.values(bots)
        .filter(bot => bot.type)
        .map(bot => ({
          label: bot.type + " Bot",
          value: bot.type + "_Selected",
          ...(botDescription === "Allow" && { description: bot.descriptionSmall })
        }));

      let embed = new EmbedBuilder()
        .setColor(interaction.guild.members.me?.displayColor)
        .setDescription(customMessage);

      if (image) embed.setImage(image.url);

      const dropMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("buybot-Selector")
          .setPlaceholder("Create your professional bot")
          .addOptions(botOptions)
      );

      const components = [dropMenu];
      if (infoButtonName) {
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("info")
            .setLabel(infoButtonName)
            .setStyle(buttonStyles[buttonStyleChoice])
        );
        components.push(buttons);
      }
      
      await ConfigDB.set(`MessageInfo_${client.user.id}`, infoButtonMessage);

      await channel.send({
        ...(messageType === "embed" && { embeds: [embed] }),
        ...(messageType === "content" && { content: customMessage }),
        ...(messageType === "imageonly" && { files: [image.url] }),
        components
      });

      return interaction.reply({
        content: "Panel sent successfully.",
        ephemeral: true,
      });

    } catch (error) {
            console.log(error)
            return interaction.editReply({ embeds: [embeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};