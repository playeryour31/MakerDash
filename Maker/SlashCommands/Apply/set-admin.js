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
  ChatInputCommandInteraction,
} = require("discord.js");
const db = require("../../lib/applyDb");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("apply-admin")
    .setDescription("Set/Change the admin role for apply system.")
    .addRoleOption((role) =>
      role.setName("role").setDescription("Pick the role.").setRequired(true),
    ),
  type: "Apply",
  botP: [],
  userP: [PermissionFlagsBits.Administrator],
  P: "Administrator",
  support: false,
  ownerOnly: false,
  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  async run(client, interaction, language, reply, replyEmbeds, name) {
    try {
      let role = interaction.options.getRole("role");

      await db
        .set(
          "applyAdmin_" + interaction.guild.id + "_" + client.user.id,
          role.id,
        )
        .then(() => {
          let embed = new EmbedBuilder()
            .setColor("Green")
            .setDescription(reply.Apply.Reply5.replace("[ROLE]", role));
          return interaction.reply({
            embeds: [embed],
            allowedMentions: { repliedUser: false },
          });
        });
    } catch (error) {
      console.log(error);
      return interaction.reply({
        embeds: [replyEmbeds.errorEmbed],
        ephemeral: true,
        allowedMentions: { repliedUser: false },
      });
    }
  },
};
