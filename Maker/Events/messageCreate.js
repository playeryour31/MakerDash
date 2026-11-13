const config = require("../../Main/Resources/Config.json")
const { Discord, EmbedBuilder, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, WebhookClient } = require('discord.js')
const { Database } = require("st.db")
const messages = new Database("./Maker/Resources/LanguagsProvider.json");
const {
  resolveCommandId,
  enableChannelsKey,
  enableRolesKey,
  permissionsKey,
  isModeEnabled,
} = require("../../src/shared/commands/commandStatusKey");
const { normalizeAliasValue } = require("../../src/shared/commands/aliasValue");
const { runSlashFromPrefix } = require("../../src/shared/commands/interactionBridge");
const Botlanguage = new Database("/Database/Others/Language.json");
const commandStatusdb = new Database("/Database/Others/CommandStatus.json");
const commandEnabledb = new Database("/Database/Others/EnableChannels.json");
const commandRolesdb = new Database("/Database/Others/EnableRoles.json");
const adminsDB = new Database("/Database/BotMaker/Admins.json");
const usage = new Database("./Maker/Resources/CommandUsage.json")
let autolinedb = require("../lib/featureDb")("autoline")
let feedbackdb = require("../lib/featureDb")("feedback")
let taxdb = require("../lib/featureDb")("tax")
const suggestiondb = require("../lib/featureDb")("suggestion")
const replydb = require("../lib/featureDb")("sys_reply")
const BlacksDB = new Database("/Database/BotMaker/Blacklisted.json");
const permissionsDB = new Database("/Database/BotMaker/Permissions.json");
const cooldowns = new Map();
const ownerdb = new Database("/Database/Others/OwnerData.json");
const prefixdb = new Database("/Database/Others/PrefixData.json");
const aliasesdb = new Database("/Database/Others/Aliases.json");


/**
* @param {Message} message
*/
module.exports.run = async (client, message) => {
  try {
    const commandsdb = new Database(`/Database/CommandsData/BotsCommands_${client.user.id}.json`);
    let botCommands = commandsdb.get('commands_' + client.user.id) || []
    const language = await Botlanguage.get(client.user?.id) || "En"
    const reply = await messages.get(language)
                if (BlacksDB.get(`${client.user.id}_${message.author.id}`)) { 
                    return;
                }
    if (message.author.bot || !message.guild) return;

    try {
      const guildStats = require('../../src/shared/services/guildStats');
      guildStats.increment(
        client.user.id,
        message.guild.id,
        'messages',
        message.guild.memberCount,
      );
    } catch (_) {}

    try {
      const { handleSystemAutoResponder } = require('../lib/systemAutoResponder');
      const replied = await handleSystemAutoResponder(client, message);
      if (replied) return;
    } catch (err) {
      console.warn(`[auto-responder] ${err?.message || err}`);
    }

    try {
      const { handleMessage } = require('../lib/protectionAdvanced');
      const blocked = await handleMessage(client, message);
      if (blocked) return;
    } catch (err) {
      console.warn(`[protection-advanced] ${err?.message || err}`);
    }

    try {
      const { handleMessageXp } = require('../lib/systemLeveling');
      await handleMessageXp(client, message);
    } catch (err) {
      console.warn(`[leveling] ${err?.message || err}`);
    }

    if (autolinedb.get("Autoline_" + message.guild?.id + "_" + client.user.id)?.includes(message.channel?.id)) {
      let line = autolinedb.get("Line_" + message.guild?.id + "_" + client.user.id) || null
      if (!line) {
        return message.reply({ content: reply.Autoline.Reply6, allowedMentions: { repliedUser: false } })
      }

      let mode = autolinedb.get(`autolindeMode_${message.guild?.id}_${client.user.id}`) || "file"
      if (mode == "file") {
        message.channel.send({ files: [line] })
      } else if (mode == "message") {
        message.channel.send(`${line}`)
      } else if (mode == "embed") {
        let embed = new EmbedBuilder()
          .setColor(message.guild?.members?.me.displayHexColor)
          .setImage(line)
        message.channel.send({ embeds: [embed] })
      }

    }


    // Feedback system
    if (feedbackdb.get("Feedback_" + message.guild?.id + "_" + client.user.id)?.includes(message.channel?.id)) {
      let line = feedbackdb.get("FeedbackLine_" + message.guild?.id + "_" + client.user.id) || null
      let emoji = feedbackdb.get("FeedbackEmoji_" + message.guild?.id + "_" + client.user.id) || "❤"
      message.react(emoji).catch(() => { })
      if (line) message.channel.send({ files: [line] })
    }

    // Tax system
    if (taxdb.get("Tax_" + message.guild?.id + "_" + client.user.id)?.includes(message.channel?.id)) {
      let args = message.content.split(" ").slice(0).join(" ");

      if (args.endsWith("m")) args = args.replace(/m/gi, "") * 1000000;
      else if (args.endsWith("k")) args = args.replace(/k/gi, "") * 1000;
      else if (args.endsWith("K")) args = args.replace(/K/gi, "") * 1000;
      else if (args.endsWith("M")) args = args.replace(/M/gi, "") * 1000000;
      else if (args.endsWith("b")) args = args.replace(/b/gi, "") * 1000000000;
      else if (args.endsWith("B")) args = args.replace(/B/gi, "") * 1000000000;
      else if (args.endsWith("t")) args = args.replace(/t/gi, "") * 1000000000000;
      else if (args.endsWith("T")) args = args.replace(/T/gi, "") * 1000000000000;

      let args2 = parseInt(args)

      if (isNaN(args2)) {

      } else {

        let tax = Math.floor(args2 * (20) / (19) + (1))
        let probotTaxTakes = tax - args2
        let tax2 = Math.floor(tax * (20) / (19) + (1))
        let tax3 = 0
        let tax4 = Math.floor(tax3 - tax2)

        let buttonData = taxdb.get(`TaxButton_${message.guild.id}_${client.user.id}`) || null


        const button = new ActionRowBuilder().addComponents([
          new ButtonBuilder()
            .setCustomId("taxcopy_" + tax)
            .setStyle(ButtonStyle.Primary)
            .setLabel(reply.Tax.Button.copy1)
        ]);
        if (buttonData) {
          let customTax = Math.floor(tax2 + (tax2 * buttonData.tax))
          tax3 = customTax
          tax4 = Math.floor(tax3 - tax2)
          button.setComponents(
            new ButtonBuilder()
              .setCustomId("taxcopy_" + tax)
              .setStyle(buttonData.color)
              .setLabel(buttonData.name)
          );

        }
        let MessageConetnt = taxdb.get(`TaxMessage_${message.guild.id}_${client.user.id}`) || reply.Tax.Reply7;
        MessageConetnt = MessageConetnt.replace(/\[TAX\]/g, tax)
          .replace(/\[PROBOTTAX\]/g, probotTaxTakes)
          .replace(/\[AMOUNT\]/g, args2)
          .replace(/\[CUSTOMTAX\]/g, tax3)
          .replace(/\[CUSTOMTAKE\]/g, tax4)


        const embed = new EmbedBuilder()
          .setColor(message.member.displayHexColor)
          .setThumbnail(message.guild.iconURL({ dynamic: true }))
          .setDescription(MessageConetnt)


        let line = taxdb.get("TaxLine_" + message.guild?.id + "_" + client.user.id)
        const type = taxdb.get("taxType_" + message.guild?.id + "_" + client.user.id) || 'message'
        if (type === 'embed') {
          message.reply({ embeds: [embed], components: [button] }).then(() => {
            if (line) message.channel.send({ files: [line] })
          })
        } else {
          message.reply({ content: MessageConetnt, components: [button] }).then(() => {
            if (line) message.channel.send({ files: [line] })
          })
        }


      }
    }

    // Suggestion system
    if (suggestiondb.get("Suggestion_" + message.guild?.id + "_" + client.user.id)?.includes(message.channel?.id)) {
      if (message.content.startsWith("https://")) {
        message.delete();
      } else {
        const embed = new EmbedBuilder()
          .setThumbnail(message.author.avatarURL({ dynamic: true }))
          .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ dynamic: true }) })
          .setColor("Random")
          .setDescription(`> ${message.content}`)
          .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        const attachment = message.attachments.first();
        if (attachment) {
          embed.setImage(attachment.proxyURL);
        }

        message.delete();
        message.channel.send({ embeds: [embed] }).then(async (msg) => {
          const mode = suggestiondb.get(`suggestionMode_${client.user.id}`) || 'react'
          let emojis = suggestiondb.get("emojis_" + message.guild?.id + "_" + client.user.id) || { yes: '✔', no: '❌' }

          if (mode === 'button') {
            const SugButtons = new ActionRowBuilder().addComponents([
              new ButtonBuilder()
                .setCustomId(`${msg.id}_Yes`)
                .setStyle(ButtonStyle.Success)
                .setEmoji(`${yesemoji}`)
                .setLabel("0")
                .setDisabled(false),
              new ButtonBuilder()
                .setCustomId(`${msg.id}_No`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji(`${noemoji}`)
                .setLabel("0")
                .setDisabled(false),
            ]);

            msg.edit({ components: [SugButtons] }).catch(err => { })
          } else {
            msg.react(`${emojis.yes}`).catch(err => { })
            await msg.react(`${emojis.no}`).catch(err => { })
          }
          const line = suggestiondb.get("SuggestionLine_" + message.guild?.id + "_" + client.user.id)
          if (line) message.channel.send({ files: [line] })
        });
      }
    }

    // Reply system
    if (replydb.get(`Replies_${message.guild.id}_${client.user.id}`)) {
    if (!message.content || message.content.length <= 0) return;
    
    let replyData = replydb.get(`Replies_${message.guild.id}_${client.user.id}`)?.filter(r => message.content.includes(r.word))[0] || null;
    
    if (replyData) {
        let replyType = replyData.reply;

        const response = replyData.responses[0]
            .replaceAll("{user}", `<@!${message.author.id}>`)
            .replaceAll("{user.username}", message.author.username)
            .replaceAll("{user.id}", message.author.id)
            .replaceAll("{user.avatarURL}", message.author.displayAvatarURL({ dynamic: true }))

            .replaceAll("{client.user.name}", message.client.user.username)
            .replaceAll("{client.user.id}", message.client.user.id)
            .replaceAll("{client.user.avatarURL}", message.client.user.displayAvatarURL({ dynamic: true }))

            .replaceAll("{server.name}", message.guild.name)
            .replaceAll("{server.id}", message.guild.id)
            .replaceAll("{server.iconURL}", message.guild.iconURL({ dynamic: true }))

            .replaceAll("[User]", `<@!${message.author.id}>`)
            .replaceAll("[UserUsername]", message.author.username)
            .replaceAll("[UserID]", message.author.id)
            .replaceAll("[UserAvatar]", message.author.displayAvatarURL({ dynamic: true }))

            .replaceAll("[BotName]", message.client.user.username)
            .replaceAll("[BotID]", message.client.user.id)
            .replaceAll("[BotAvatar]", message.client.user.displayAvatarURL({ dynamic: true }))

            .replaceAll("[ServerName]", message.guild.name)
            .replaceAll("[ServerID]", message.guild.id)
            .replaceAll("[ServerIcon]", message.guild.iconURL({ dynamic: true }));

        if (replyData.includes == false) {
            if (message.content != replyData.word) return;
            if (replyData.role && !message.member.roles.cache.some(r => r.id == replyData.role)) return;
            if (replyType == true) {
                message.reply({ content: response }).catch(() => {});
            } else {
                message.channel.send({ content: response }).catch(() => {});
            }
        } else {
          if (replyData.role && message.member.roles.cache.some(r => r.id == replyData.role)) return
          if (!message.content.includes(replyData.word)) return
            if (replyType == true) {
                message.reply({ content: response }).catch(() => {});
            } else {
                message.channel.send({ content: response }).catch(() => {});
            }
        }
    }
}


    const prefix = prefixdb.get("Prefix_" + client.user.id) || '--'
    const owner = ownerdb.get("Owner_" + client.user.id) || '--'
    if (message.content.match(new RegExp(`^<@!?${message.client.user.id}>`))) {
      return message.reply(reply.Others.Reply14.replace("[USER]", message.author).replace("[CLIENT]", client.user).replaceAll("[PREFIX]", prefix));
    }



    if (!message.member) message.member = await message.guild.fetchMember(message);

    const args = message.content.slice().trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();
    if (cmd.length === 0) return;

    const withPrefix = cmd.startsWith(prefix);
    const bare = withPrefix ? cmd.slice(prefix.length) : cmd;

    const resolveAliasEntry = (token) => {
      const raw = aliasesdb.get(`${token}_${client.user.id}`);
      return normalizeAliasValue(raw);
    };

    let aliasHit =
      resolveAliasEntry(cmd) ||
      (withPrefix ? resolveAliasEntry(bare) : null) ||
      (!withPrefix ? resolveAliasEntry(prefix + cmd) : null);

    if (aliasHit?.requirePrefix && !withPrefix) {
      aliasHit = null;
    }

    const targetName = aliasHit?.command || bare;
    let command = client.commands.get(bare) || client.commands.get(targetName);
    let slashCommand = null;
    let bridged = false;

    if (!command) {
      slashCommand =
        client.slashcommands?.get(bare) ||
        client.slashcommands?.get(targetName) ||
        null;
      if (slashCommand) bridged = true;
    }

    if (!command && !slashCommand) return;
    // Prefix required unless alias allows bare invoke
    if (!withPrefix && !aliasHit) return;

    const runModule = command || slashCommand;
    const typeMatch = (com) =>
      com.type == runModule.type ||
      (com.type == 'Azkar' && runModule.type == 'Muslim') ||
      (com.type == 'Muslim' && runModule.type == 'Azkar');

    const catalogMatch = botCommands.find((com) => {
      if (!com || !typeMatch(com)) return false;
      if (command && com.prefix_commandName == command.name) return true;
      const slashName = slashCommand?.data?.name || slashCommand?.name;
      if (
        slashCommand &&
        (com.slash_commandName == slashName || resolveCommandId(com) == slashName)
      ) {
        return true;
      }
      return false;
    });

    if (!catalogMatch) return;

    const cmdId = resolveCommandId(catalogMatch);
    if (
      !isModeEnabled(
        (k) => commandStatusdb.get(k),
        client.user.id,
        cmdId,
        'prefix',
      )
    ) {
      return;
    }

    const commandEnabled =
      commandEnabledb.get(enableChannelsKey(client.user.id, cmdId)) || [];
    if (
      commandEnabled.length &&
      !commandEnabled.includes(`${message.channel.id}`)
    ) {
      return;
    }

    const commandRoles =
      commandRolesdb.get(enableRolesKey(client.user.id, cmdId)) || [];
    if (commandRoles.length) {
      const memberRoleIds = message.member?.roles?.cache
        ? [...message.member.roles.cache.keys()]
        : [];
      const hasRole = commandRoles.some((id) =>
        memberRoleIds.includes(String(id)),
      );
      if (!hasRole) return;
    }

    if (BlacksDB.get(`${client.user.id}_${message.author.id}`)) {
      return;
    }

    if (runModule?.botP?.length) {
      for (const perm of runModule.botP) {
        const bot = message.guild.members.me;
        const commandP = runModule.P || perm;
        if (!bot?.permissions.has(perm)) {
          return message.reply({
            content: reply.Others.Reply17.replace('[PREMS]', commandP),
            allowedMentions: { repliedUser: false },
          });
        }
      }
    }

    const AdminsList = adminsDB.get(`Admins_${client.user.id}`) || null;
    if (!config.Owner.includes(message.author.id)) {
      if (
        AdminsList &&
        Array.isArray(AdminsList) &&
        AdminsList.includes(message.author.id)
      ) {
        if (runModule.type === 'Config') {
          return message.reply({
            content: reply.Owner.Reply6,
            allowedMentions: { repliedUser: false },
          });
        }
      } else {
        const commandPermissions =
          permissionsDB.get(permissionsKey(client.user.id, cmdId)) ||
          runModule.userP ||
          [];
        if (commandPermissions.length) {
          for (const perm of commandPermissions) {
            if (!message?.member?.permissions.has(perm)) {
              const commandP = perm || runModule.P;
              return message.reply({
                content: reply.Others.Reply18.replace('[PREMS]', commandP),
                allowedMentions: { repliedUser: false },
              });
            }
          }
        }

        if (runModule.ownerOnly && owner !== message.author.id) {
          return message.reply({
            content: reply.Owner.Reply6,
            allowedMentions: { repliedUser: false },
          });
        }
      }
    }

    const allData = aliasesdb.all() || [];
    const commandAliases = {};
    for (const element of allData) {
      if (!element.ID || element.data == null) continue;
      if (!element.ID.includes(client.user.id)) continue;
      const resolved = normalizeAliasValue(element.data);
      if (!resolved) continue;
      let alias = element.ID;
      if (alias.includes('_')) alias = alias.split('_')[0];
      if (!commandAliases[resolved.command]) commandAliases[resolved.command] = [];
      if (!commandAliases[resolved.command].includes(alias)) {
        commandAliases[resolved.command].push(alias);
      }
    }

    const displayName =
      command?.name ||
      slashCommand?.data?.name ||
      slashCommand?.name ||
      cmdId;
    let replyList = '';
    if (commandAliases[displayName]?.length) {
      replyList = commandAliases[displayName].join(', ');
    }

    let helpCommand = displayName;
    if (displayName == 'help' && args[0] && args[0] != 'help') helpCommand = args[0];
    let help = usage.get(helpCommand);
    let embeds;

    if (help) {
      let embedFields = [
        { name: '**Command: ' + helpCommand + '**', value: help.description },
        {
          name: '**Usage:**',
          value: help.usage.replace('[user]', message.author),
        },
        {
          name: '**Examples:**',
          value: help.examples
            .replaceAll('[author]', message.author)
            .replaceAll('[author.id]', message.author?.id),
        },
      ];
      if (replyList) {
        embedFields.splice(1, 0, { name: '**Aliases:**', value: replyList });
      }
      embeds = {
        usageEmbed: new EmbedBuilder()
          .setColor('DarkButNotBlack')
          .addFields(embedFields),
        notFoundEmbed: new EmbedBuilder()
          .setColor('DarkButNotBlack')
          .setDescription(
            reply.NotFound.Reply1.replace('[COMMAND]', displayName),
          ),
      };
    } else if (helpCommand == displayName) {
      embeds = {
        usageEmbed: new EmbedBuilder()
          .setColor('DarkButNotBlack')
          .setDescription(
            reply.NotFound.Reply1.replace('[COMMAND]', displayName),
          ),
        notFoundEmbed: new EmbedBuilder()
          .setColor('DarkButNotBlack')
          .setDescription(
            reply.NotFound.Reply1.replace('[COMMAND]', displayName),
          ),
      };
    } else {
      embeds = null;
    }

    const cooldownKey = `${message.author.id}_${client.user.id}_${displayName}`;
    const cooldownTime = runModule.cooldown || 10000;
    const lastUsed = cooldowns.get(cooldownKey);
    if (lastUsed && Date.now() - lastUsed < cooldownTime) {
      const timeLeft = ((cooldownTime - (Date.now() - lastUsed)) / 1000).toFixed(1);
      message
        .reply({
          content: reply.Others.ReplyCooldown1.replace('[TIME]', timeLeft),
          allowedMentions: { repliedUser: false },
        })
        .then((replyMessage) => {
          setTimeout(() => replyMessage.delete().catch(() => {}), 5000);
        })
        .catch(() => {});
      return;
    }
    cooldowns.set(cooldownKey, Date.now());

    if (bridged && slashCommand) {
      const result = await runSlashFromPrefix(
        client,
        message,
        args,
        slashCommand,
        language,
        reply,
        embeds,
        displayName,
      );
      if (!result.ok && result.error) {
        return message
          .reply({
            content: result.error,
            allowedMentions: { repliedUser: false },
          })
          .catch(() => {});
      }
      return;
    }

    if (command) {
      command.run(
        client,
        message,
        args,
        language,
        reply,
        embeds,
        command.name,
        botCommands,
      );
    }

  } catch (error) {
           console.log(error)

  }
};
