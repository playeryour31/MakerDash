const config = require("../Resources/Config.json");
const { Client, Interaction, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { resolveByCustomId } = require("../../src/shared/utils/customIdResolver");
/**
 *
 * @param {Client} client
 * @param {Interaction} interaction
 * @returns
 */
module.exports.run = async (client, interaction) => {
const Colors = require("../Resources/Colors.json");
		const Text = require("../Resources/Messages.json");

  if (interaction.isCommand()) {
    const { commandName, options, user, guildId } = interaction;

    const command =
      client.slashcommands?.get(commandName) ||
      client.Guildcommands?.get(commandName);
    if (!command) return;

    if (command.ownerOnly === true) {
      if (!config.Owner.includes(interaction.user.id)) {
        const embed = new EmbedBuilder()
          .setColor(Colors.RedWarn)
          .setDescription(`ليس لديك إذن لاستخدام هذا الأمر!`);
        return interaction.reply({ embeds: [embed], ephemeral: false });
      }
    }

    if (!config.Configure.CommandChannel.includes(interaction.channel.id) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(Colors.Yellow)
        .setDescription(`لا يمكن استخدام هذا الأمر إلا في <#${config.Configure.CommandChannel}> فقط`);
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    try {
      if (command) {
        await command.run(client, interaction, Text);
      }

    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
    }
  }

  else if (interaction.isButton()) {
    const button = resolveByCustomId(client.button, interaction.customId);

    if (!button) return;

    if (button.ownerOnly === true) {
      if (!config.Owner.includes(interaction.user.id)) {
        const embed = new EmbedBuilder()
          .setColor(Colors.RedWarn)
          .setDescription(`ليس لديك إذن لاستخدام هذا الأمر!`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    try {
      if (button) {
        await button.run(client, interaction, Text);
      }

    } catch (error) {
      console.error(`Error executing button ${interaction.customId}:`, error);
    }
  }

  else if (interaction.type === 3) {
    const selectMenu = resolveByCustomId(client.selectmenu, interaction.customId);

    if (!selectMenu) return;

    if (selectMenu.ownerOnly === true) {
      if (!config.Owner.includes(interaction.user.id)) {
        const embed = new EmbedBuilder()
          .setColor(Colors.RedWarn)
          .setDescription(`ليس لديك إذن لاستخدام هذا الأمر!`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
    try {
      if (selectMenu) {
        await selectMenu.run(client, interaction, Text);
      }

    } catch (error) {
      console.error(`Error executing select menu ${interaction.customId}:`, error);
    }
  }

  else if (interaction.isModalSubmit()) {
    const modal = resolveByCustomId(client.modal, interaction.customId);

    if (!modal) return;

    // Only purchase modals need an immediate ack (slow DB / token login).
    // Other modals (e.g. aliases) use reply/update and must not be deferred here.
    const purchaseModal =
      /purches|purchase/i.test(String(modal.name || '')) ||
      /purches|purchase/i.test(String(interaction.customId || ''));
    if (purchaseModal) {
      try {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ ephemeral: true });
        }
      } catch (ackErr) {
        if (ackErr?.code === 10062) {
          console.warn(
            `[interactionCreate] modal expired before defer: ${interaction.customId}`,
          );
          return;
        }
        console.error(`Error deferring modal ${interaction.customId}:`, ackErr);
        return;
      }
    }

    if (modal.ownerOnly === true) {
      if (!config.Owner.includes(interaction.user.id)) {
        const embed = new EmbedBuilder()
          .setColor(Colors.RedWarn)
          .setDescription(`ليس لديك إذن لاستخدام هذا الأمر!`);
        if (interaction.deferred || interaction.replied) {
          return interaction.editReply({ embeds: [embed] });
        }
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    try {
      if (modal) {
        await modal.run(client, interaction, Text);
      }

    } catch (error) {
      console.error(`Error executing modal ${interaction.customId}:`, error);
      if (interaction.deferred || interaction.replied) {
        await interaction
          .editReply({ content: 'حدث خطأ أثناء معالجة الطلب.' })
          .catch(() => {});
      }
    }
  }
};
