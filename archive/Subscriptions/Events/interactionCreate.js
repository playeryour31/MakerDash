const moment = require("moment");
const {
    Client,
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
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");
const { Database } = require("st.db");
const BotsBlacklisted = new Database("./Database/BotMaker/BotsBlacklisted.json");
const Botlanguage = new Database("/Database/Others/Language.json");
const db = new Database("./Database/Others/BotMakerTokens.json");
const cooldowns = new Map();
const config = require('../../Main/Resources/Config.json');
const path = require('path');
const BotMakerDB = new Database("./Database/BotMaker/Data.json");

/**
 * 
 * @param {Client} client 
 * @param {Interaction} interaction 
 * @returns 
 */
module.exports.run = async (client, interaction) => {
  try {


    const status = await BotsBlacklisted.get(client.user.id);
    if (!interaction || interaction.bot || !interaction.guild) return;
		let language;
		let reply;
    if (status) {
      return interaction.reply({
        content: "Your bot is blacklisted.",
        ephemeral: false,
      });
    }

    let tokens = db.get("Subscriptions") || [];
    let owner = tokens.find(t => t.ClientID === client.user.id)?.Owner;

    const applyCooldown = (key, cooldownTime) => {
      const lastUsed = cooldowns.get(key);
      if (lastUsed && Date.now() - lastUsed < cooldownTime) {
        const timeLeft = ((cooldownTime - (Date.now() - lastUsed)) / 1000).toFixed(1);
        return timeLeft;
      }
      cooldowns.set(key, Date.now());
      return null;
    };

      const embeds = {
        usageEmbed: new EmbedBuilder()
          .setColor(interaction.guild.members.me.displayHexColor)
          .setDescription(`Command not found.`),

        notFoundEmbed: new EmbedBuilder()
          .setColor(interaction.guild.members.me.displayHexColor)
          .setDescription(`This command not found.`),
        
        errorEmbed: new EmbedBuilder()
          .setColor(interaction.guild.members.me.displayHexColor)
          .setDescription("##Error\nAn unexpected error occurred while processing your request. Please try again later."),
      };
      
    if (interaction.isCommand()) {
      const { commandName } = interaction;
      const command = client.slashcommands.get(commandName) || client.Guildcommands.get(commandName);

      if (!command) return;

      const cooldownKey = `${interaction.user.id}_${client.user.id}_${commandName}`;
      const timeLeft = applyCooldown(cooldownKey, command.cooldown || 5000);

      if (timeLeft) {
        return interaction.reply({
          content: `Please wait ${timeLeft} seconds before using this command again.`,
          ephemeral: true,
        });
      }
            const data = BotMakerDB.get(`BotMakerData_${client.user.id}_${interaction.guild.id}`) || {};

const commandsRoom = data.commandRoom;
const CommandsRoom = client.channels.cache.get(commandsRoom);
      if (!config.Owner.includes(interaction.user.id)) {

if (CommandsRoom && interaction.channel.id !== CommandsRoom.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: `This command can only be used in <#${CommandsRoom.id}>`, ephemeral: true });
}
      }

      if (!config.Owner.includes(interaction.user.id)) {
        if (command?.botP?.length) {
          const bot = interaction.guild.members.me;
          for (const perm of command.botP) {
            if (!bot.permissions.has(perm)) {
              return interaction.reply({
                content: "I do not have the required permissions to execute this command.",
                ephemeral: true
              });
            }
          }
        }

        if (command.ownerOnly === true && !owner.includes(interaction.user.id)) {
          return interaction.reply({
            content: "Only the bot owner can use this command.",
            ephemeral: true
          });
        }
      }


      try {
        await command.run(client, interaction, language, null, embeds, command.name);
      } catch (error) {
        console.error(`Error executing command ${commandName}:`, error);
        return interaction.reply({ embeds: [embeds.errorEmbed], ephemeral: false });
      }
    } else if (interaction.isButton()) {
    const button = await client.button.get(interaction.customId)
      || client.button.get(interaction.customId.split("_")[0]?.trim())
      || client.button.get(interaction.customId.split("_")[1]?.trim())
      || client.button.get(interaction.customId.split("_")[2]?.trim())
      || client.button.get(interaction.customId.split("_")[3]?.trim())
      || client.button.get(interaction.customId.split("_")[4]?.trim())
      || client.button.get(interaction.customId.split("_")[5]?.trim())
      if (!button) return;

      const cooldownKey = `${interaction.user.id}_${client.user.id}_${button.name}`;
      const timeLeft = applyCooldown(cooldownKey, button.cooldown || 5000);

      if (timeLeft) {
        return interaction.reply({
          content: `Please wait ${timeLeft} seconds before using this button again.`,
          ephemeral: true,
        });
      }

      if (!config.Owner.includes(interaction.user.id)) {
        if (button?.botP?.length) {
          const bot = interaction.guild.members.me;
          for (const perm of button.botP) {
            if (!bot.permissions.has(perm)) {
              return interaction.reply({
                content: "I do not have the required permissions to execute this button.",
                ephemeral: true
              });
            }
          }
        }

        if (button.ownerOnly === true && owner !== interaction.user.id) {
          return interaction.reply({
            content: "Only the bot owner can use this button.",
            ephemeral: true
          });
        }
      }

      try {
        await button.run(client, interaction, language, null, button.name);
      } catch (error) {
        console.error(`Error executing button ${button.name}:`, error);
        return interaction.reply({ embeds: [embeds.errorEmbed], ephemeral: true });
      }
    } else if (interaction.isSelectMenu()) {
    const selectMenu = await client.selectmenu.get(interaction.customId)
      || client.selectmenu.get(interaction.customId.split("_")[0]?.trim())
      || client.selectmenu.get(interaction.customId.split("_")[1]?.trim())
      || client.selectmenu.get(interaction.customId.split("_")[2]?.trim())
      || client.selectmenu.get(interaction.customId.split("_")[3]?.trim())
      || client.selectmenu.get(interaction.customId.split("_")[4]?.trim())
      || client.selectmenu.get(interaction.customId.split("_")[5]?.trim())
      if (!selectMenu) return;

      const cooldownKey = `${interaction.user.id}_${client.user.id}_${selectMenu.name}`;
      const timeLeft = applyCooldown(cooldownKey, selectMenu.cooldown || 5000);

      if (timeLeft) {
        return interaction.reply({
          content: `Please wait ${timeLeft} seconds before using this select menu again.`,
          ephemeral: true,
        });
      }

      if (!config.Owner.includes(interaction.user.id)) {
        if (selectMenu?.botP?.length) {
          const bot = interaction.guild.members.me;
          for (const perm of selectMenu.botP) {
            if (!bot.permissions.has(perm)) {
              return interaction.reply({
                content: "I do not have the required permissions to execute this select menu.",
                ephemeral: true
              });
            }
          }
        }

        if (selectMenu.ownerOnly === true && owner !== interaction.user.id) {
          return interaction.reply({
            content: "Only the bot owner can use this select menu.",
            ephemeral: true
          });
        }
      }

      try {
        await selectMenu.run(client, interaction, language, null, null, selectMenu.name);
      } catch (error) {
        console.error(`Error executing select menu ${selectMenu.name}:`, error);
        return interaction.reply({ embeds: [embeds.errorEmbed], ephemeral: true });
      }
    } else if (interaction.isModalSubmit()) {
    const modal = await client.modal.get(interaction.customId)
      || client.modal.get(interaction.customId.split("_")[0]?.trim())
      || client.modal.get(interaction.customId.split("_")[1]?.trim())
      || client.modal.get(interaction.customId.split("_")[2]?.trim())
      || client.modal.get(interaction.customId.split("_")[3]?.trim())
      || client.modal.get(interaction.customId.split("_")[4]?.trim())
      || client.modal.get(interaction.customId.split("_")[5]?.trim())
    if (!modal) return;

      const cooldownKey = `${interaction.user.id}_${client.user.id}_${modal.name}`;
      const timeLeft = applyCooldown(cooldownKey, modal.cooldown || 5000);

      if (timeLeft) {
        return interaction.reply({
          content: `Please wait ${timeLeft} seconds before using this modal again.`,
          ephemeral: true,
        });
      }

      if (!config.Owner.includes(interaction.user.id)) {
        if (modal?.botP?.length) {
          const bot = interaction.guild.members.me;
          for (const perm of modal.botP) {
            if (!bot.permissions.has(perm)) {
              return interaction.reply({
                content: "I do not have the required permissions to execute this modal.",
                ephemeral: true
              });
            }
          }
        }

        if (modal.ownerOnly === true && owner !== interaction.user.id) {
          return interaction.reply({
            content: "Only the bot owner can use this modal.",
            ephemeral: true
          });
        }
      }

      try {
        await modal.run(client, interaction, language, null, null, modal.name);
      } catch (error) {
        console.error(`Error executing modal ${modal.name}:`, error);
        return interaction.reply({ embeds: [embeds.errorEmbed], ephemeral: true });
      }
    }
  } catch (error) {
    console.error("Error in interaction handler:", error);
  }
};
