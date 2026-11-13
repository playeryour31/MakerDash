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

module.exports = {
  name: "ban-list",
  type: "System",
  botP: [PermissionFlagsBits.BanMembers],
  userP: [PermissionFlagsBits.BanMembers],
  P: "BanMembers",
  ownerOnly: false,

  run: async (client, message, args, language, reply, replyEmbeds, name) => {
    try {
      const bans = await message.guild.bans.fetch();
      if (bans.size === 0) {
        return message.reply({ content: reply.System.BanList1, allowedMentions: { repliedUser: false } });
      }
      
      let rr = language === "Ar" ? "لا يوجد سبب" : "No reason provided";
      
      const bannedUsers = bans.map((ban, index) => {
        const reason = ban.reason || rr;
        return `**#${ban.user.tag}**\n-# (${ban.user.id})\n-# Reason: ${reason}`;
      });
      
      const itemsPerPage = 10;
      let currentPage = 0;
      
      const generateEmbed = (page) => {
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = bannedUsers.slice(start, end).join("\n\n");
        
        return new EmbedBuilder()
          .setColor(message.guild.members.me.displayColor)
          .setTitle(reply.System.BanList + ` (${bans.size})`)
          .setDescription(pageItems)
          .setFooter({ text: `${page + 1}/${Math.ceil(bannedUsers.length / itemsPerPage)}` });
      };
      
      let components = [];
      if (bannedUsers.length > itemsPerPage) {
        components = [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("prev_page").setEmoji("⬅️").setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId("next_page").setEmoji("➡️").setStyle(ButtonStyle.Primary)
          )
        ];
      }
      
      const msg = await message.reply({ embeds: [generateEmbed(currentPage)], components, allowedMentions: { repliedUser: false } });
      
      if (bannedUsers.length <= itemsPerPage) return;
      
      const collector = msg.createMessageComponentCollector({ time: 60000 });
      
      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id) {
          return i.reply({ content: "❌ You cannot control this menu.", ephemeral: true });
        }
        
        if (i.customId === "prev_page" && currentPage > 0) {
          currentPage--;
        } else if (i.customId === "next_page" && currentPage < Math.ceil(bannedUsers.length / itemsPerPage) - 1) {
          currentPage++;
        }
        
        await i.update({
          embeds: [generateEmbed(currentPage)],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId("prev_page").setEmoji("⬅️").setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
              new ButtonBuilder().setCustomId("next_page").setEmoji("➡️").setStyle(ButtonStyle.Primary).setDisabled(currentPage === Math.ceil(bannedUsers.length / itemsPerPage) - 1)
            )
          ]
        });
      });
      
      collector.on("end", () => {
        msg.edit({ components: [] }).catch(() => {});
      });
      
    } catch (error) {
      console.error(error);
      return message.reply({ embeds: [replyEmbeds.errorEmbed], allowedMentions: { repliedUser: false } });
    }
  }
};