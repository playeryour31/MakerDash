const config = require("../../Main/Resources/Config.json")
const { Client, Interaction, PermissionFlagsBits, EmbedBuilder } = require('discord.js')
const { Database } = require("st.db")
const messages = new Database("./Maker/Resources/LanguagsProvider.json");
const { resolveByCustomId } = require("../../src/shared/utils/customIdResolver");
const {
  resolveCommandId,
  enableChannelsKey,
  enableRolesKey,
  permissionsKey,
  isModeEnabled,
} = require("../../src/shared/commands/commandStatusKey");
const Botlanguage = new Database("/Database/Others/Language.json");
const commandStatusdb = new Database("/Database/Others/CommandStatus.json");
const commandEnabledb = new Database("/Database/Others/EnableChannels.json");
const commandRolesdb = new Database("/Database/Others/EnableRoles.json");
const ownerdb = new Database("/Database/Others/OwnerData.json");
const adminsDB = new Database("/Database/BotMaker/Admins.json");
const permissionsDB = new Database("/Database/BotMaker/Permissions.json");
const cooldowns = new Map();
const BlacksDB = new Database("/Database/BotMaker/Blacklisted.json");

/**
 * 
 * @param {Client} client 
 * @param {Interaction} interaction 
 * @returns 
 */
module.exports.run = async (client, interaction) => {
  const commandsdb = new Database(`/Database/CommandsData/BotsCommands_${client.user.id}.json`);
  const language = await Botlanguage.get(client.user?.id) || "En"
  const reply = await messages.get(language)
  const owner = ownerdb.get("Owner_" + client.user.id) || '--'
  let botCommands = commandsdb.get('commands_' + client.user.id) || []

 const applyCooldown = (key, cooldownTime) => {
      const lastUsed = cooldowns.get(key);
      if (lastUsed && Date.now() - lastUsed < cooldownTime) {
        const timeLeft = ((cooldownTime - (Date.now() - lastUsed)) / 1000).toFixed(1);
        return timeLeft;
      }
      cooldowns.set(key, Date.now());
      return null;
    };
                if (BlacksDB.get(`${client.user.id}_${interaction.user.id}`)) { 
                    return interaction.reply({ content: reply.NotFound.Reply6, ephemeral: true });
                }


  if (interaction.isCommand()) {
    const { commandName, options, user, guildId } = interaction;
    const command = await client.slashcommands.get(commandName) || await client.Guildcommands.get(commandName)
    if (!command) return;
    botCommands.map(com => {
      const typeOk =
        com.type == command.type ||
        (com.type == 'Azkar' && command.type == 'Muslim') ||
        (com.type == 'Muslim' && command.type == 'Azkar');
      if (typeOk && com.slash_commandName == commandName) {
        const cmdId = resolveCommandId(com);
        if (
          !isModeEnabled(
            (k) => commandStatusdb.get(k),
            client.user.id,
            cmdId,
            'slash',
          )
        ) {
          return interaction.reply({ content: `${reply.Others.Reply21}`, ephemeral: true })
        }
        let commandEnabled = commandEnabledb.get(enableChannelsKey(client.user.id, cmdId)) || []
        if (commandEnabled.length && !commandEnabled.includes(`${interaction.channel.id}`)) return interaction.reply({ content: `${reply.Others.Reply22.replace("[CHANNEL]", `#${interaction.channel.name}`)}`, ephemeral: true })
        const commandRoles = commandRolesdb.get(enableRolesKey(client.user.id, cmdId)) || []
        if (commandRoles.length) {
          const memberRoleIds = interaction.member?.roles?.cache
            ? [...interaction.member.roles.cache.keys()]
            : (Array.isArray(interaction.member?.roles) ? interaction.member.roles.map(String) : [])
          const hasRole = commandRoles.some((id) => memberRoleIds.includes(String(id)))
          if (!hasRole) {
            return interaction.reply({
              content: reply.Others.Reply18?.replace?.('[PREMS]', 'role') || 'You need an allowed role to use this command.',
              ephemeral: true,
            })
          }
        }
      const cooldownKey = `${interaction.user.id}_${client.user.id}_${commandName}`;
      const timeLeft = applyCooldown(cooldownKey, command.cooldown || 5000);
		const AdminsList = adminsDB.get(`Admins_${client.user.id}`) || null;
      if (timeLeft) {
        return interaction.reply({
          content: reply.Others.ReplyCooldown.replace("[TIME]", timeLeft),
          ephemeral: true,
        });
      }
		//console.log(AdminsList)
  if (config.Owner.includes(interaction.user.id)) {

} else {

if (AdminsList && Array.isArray(AdminsList) && AdminsList.includes(interaction.user.id)) {
    if (command.type === "Config") {
        return interaction.reply({ 
            content: reply.Owner.Reply6, 
            ephemeral: true, 
            allowedMentions: { repliedUser: false } 
        });
    }
} else {
    const commandPermissions = permissionsDB.get(permissionsKey(client.user.id, cmdId)) || command.userP || [];
    if (commandPermissions.length) { 
        for (const perm of commandPermissions) { 
            if (!interaction?.member?.permissions.has(perm)) { 
            const commandP = perm || command.P
                return interaction.reply({ 
                    content: reply.Others.Reply18.replace("[PREMS]", commandP), 
                    ephemeral: true 
                });
            }
        }
    }

    if (command.ownerOnly && owner !== interaction.user.id) {
        return interaction.reply({ 
            content: reply.Owner.Reply6, 
            ephemeral: true, 
            allowedMentions: { repliedUser: false } 
        });
    }
}


if (command?.botP?.length) {
    for (const perm of command.botP) {
        const bot = interaction.guild.members.me;
        const commandP = command.P;
        if (!bot?.permissions.has(perm)) {
            return interaction.reply({ 
                content: reply.Others.Reply17.replace("[PREMS]", commandP), 
                ephemeral: true 
            });
        }
    }
}
}


        let embeds;
        embeds = {
          notFoundEmbed: new EmbedBuilder()
            .setColor("DarkButNotBlack")
            .setDescription(reply.NotFound.Reply1.replace("[COMMAND]", commandName)),

          errorEmbed: new EmbedBuilder()
            .setColor("DarkButNotBlack")
            .setDescription(reply.Errors.Reply1.replace("[COMMAND]", commandName))
        }

        try {
          if (command) {
            command.run(client, interaction, language, reply, embeds, commandName);
          }
        } catch (error) {
          console.error(`Error executing command ${commandName}:`, error);
        }
      }
    })
  }
  //Buttons Hanlder
  else if (interaction.isButton()) {
    const button = resolveByCustomId(client.button, interaction.customId);
    if (!button) return;
      const cooldownKey = `${interaction.user.id}_${client.user.id}_${button.name}`;
      const timeLeft = applyCooldown(cooldownKey, button.cooldown || 15000);

      if (timeLeft) {
        return interaction.reply({
          content: reply.Others.ReplyCooldown.replace("[TIME]", timeLeft),
          ephemeral: true,
        });
      }
    if (config.Owner.includes(interaction.user.id)) {

    } else {
      if (button?.userP?.length) {
        for (const perm of button.userP) {
          const commandP = button.P
          if (!interaction?.member?.permissions.has(perm)) {
            return interaction.reply({ content: reply.Others.Reply18.replace("[PREMS]", commandP).replace("command", "button"), ephemeral: true })
          }
        }
      }

      if (button.ownerOnly == true) {
        if (owner != interaction.user.id)
          return interaction.reply({ content: reply.Owner.Reply6, ephemeral: true, allowedMentions: { repliedUser: false } })
      }
    }

    let embeds;
    embeds = {
      notFoundEmbed: new EmbedBuilder()
        .setColor("DarkButNotBlack")
        .setDescription(reply.NotFound.Reply1.replace("[COMMAND]", interaction?.id)),

      errorEmbed: new EmbedBuilder()
        .setColor("DarkButNotBlack")
        .setDescription(reply.Errors.Reply1.replace("[COMMAND]", interaction?.id))
    }
    try {
      if (button) {
        await button.run(client, interaction, language, reply, embeds, interaction.customId);
      }
    } catch (error) {
      console.error(`Error executing button ${interaction?.id}:`, error);
    }
  }

  //SelectMenu Handler
  else if (interaction.type === 3) {
    const selectMenu = resolveByCustomId(client.selectmenu, interaction.customId, {
      indexes: [0, 1, 2, 3, 4, 5, 7, 8, 9],
    });
    if (!selectMenu) return;
      const cooldownKey = `${interaction.user.id}_${client.user.id}_${selectMenu.name}`;
      const timeLeft = applyCooldown(cooldownKey, selectMenu.cooldown || 5000);

      if (timeLeft) {
        return interaction.reply({
          content: reply.Others.ReplyCooldown.replace("[TIME]", timeLeft),
          ephemeral: true,
        });
      }
    if (config.Owner.includes(interaction.user.id)) {

    } else {
      if (selectMenu?.userP?.length) {
        for (const perm of selectMenu.userP) {
          const commandP = selectMenu.P
          if (!interaction?.member?.permissions.has(perm)) {
            return interaction.reply({ content: reply.Others.Reply18.replace("[PREMS]", commandP).replace("command", "menu"), ephemeral: true })
          }
        }
      }

      if (selectMenu.ownerOnly === true) {
        if (owner != interaction.user.id)
          return interaction.reply({ content: reply.Owner.Reply6, ephemeral: true, allowedMentions: { repliedUser: false } })
      }
    }


    let embeds;
    embeds = {
      notFoundEmbed: new EmbedBuilder()
        .setColor("DarkButNotBlack")
        .setDescription(reply.NotFound.Reply1.replace("[COMMAND]", interaction?.id)),

      errorEmbed: new EmbedBuilder()
        .setColor("DarkButNotBlack")
        .setDescription(reply.Errors.Reply1.replace("[COMMAND]", interaction?.id))
    }
    try {
      if (selectMenu) {
        await selectMenu.run(client, interaction, language, reply, embeds, interaction.customId);
      }
    } catch (error) {
      console.error(`Error executing select menu ${interaction?.id}:`, error);
    }
  }

  //Modals
  else if (interaction.isModalSubmit()) {
    const modal = resolveByCustomId(client.modal, interaction.customId, { maxParts: 10 });
    if (!modal) return;

      const cooldownKey = `${interaction.user.id}_${client.user.id}_${modal.name}`;
      const timeLeft = applyCooldown(cooldownKey, modal.cooldown || 5000);

      if (timeLeft) {
        return interaction.reply({
          content: reply.Others.ReplyCooldown.replace("[TIME]", timeLeft),
          ephemeral: true,
        });
      }
    if (config.Owner.includes(interaction.user.id)) {

    } else {
      if (modal?.userP?.length) {
        for (const perm of modal.userP) {
          const commandP = modal.P
          if (!interaction?.member?.permissions.has(perm)) {
            return interaction.reply({ content: reply.Others.Reply18.replace("[PREMS]", commandP).replace("command", "modal"), ephemeral: true })
          }
        }
      }

      if (modal.ownerOnly === true) {
        if (owner != interaction.user.id)
          return interaction.reply({ content: reply.Owner.Reply6, ephemeral: true, allowedMentions: { repliedUser: false } })
      }
    }
    let embeds;
    embeds = {
      notFoundEmbed: new EmbedBuilder()
        .setColor("DarkButNotBlack")
        .setDescription(reply.NotFound.Reply1.replace("[COMMAND]", interaction?.id)),

      errorEmbed: new EmbedBuilder()
        .setColor("DarkButNotBlack")
        .setDescription(reply.Errors.Reply1.replace("[COMMAND]", interaction?.id))
    }

    try {
      if (modal) {
        await modal.run(client, interaction, language, reply, embeds, interaction.customId);
      }
    } catch (error) {
      console.error(`Error executing modal ${interaction?.id}:`, error);
    }
  }

}
