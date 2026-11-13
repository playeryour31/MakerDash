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
const moment = require("moment");
const { Database } = require("st.db");
const messages = new Database("./Maker/Resources/LanguagsProvider.json");
const Botlanguage = new Database("/Database/Others/Language.json");
const db = require("../lib/featureDb")("sys_log");
const TempDB = require("../lib/featureDb")("sys_voicetemp");
const TempSettingsDB = require("../lib/featureDb")("temp_voice");
const TempCatchDB = require("../lib/featureDb")("temp_channels");

module.exports.run = async (client, oldState, newState) => {
  try {
    try {
      const { handleVoiceXp } = require('../lib/systemLeveling');
      await handleVoiceXp(client, oldState, newState);
    } catch (err) {
      console.warn(`[leveling-voice] ${err?.message || err}`);
    }

    const commandsdb = new Database(
      `/Database/CommandsData/BotsCommands_${client.user.id}.json`,
    );
    const language = (await Botlanguage.get(client.user?.id)) || "En";
    const botCommands = commandsdb.get("commands_" + client.user.id) || [];
    const hasTemp = botCommands.some((command) => command.type == "TempVoice");
    const hasLog = botCommands.some((command) => command.type == "Log");
    const reply = await messages.get(language);
    const words = reply.Log.Words;
    let joinLog =
      db.get(`member-joined-channel_${oldState.guild?.id}_${client.user.id}`) ||
      null;
    let leaveLog =
      db.get(`member-left-channel_${oldState.guild?.id}_${client.user.id}`) ||
      null;
    let voiceStateLog =
      db.get(`voice-state_${oldState.guild?.id}_${client.user.id}`) || null;
    if (hasTemp) {
      if (!oldState.channel && newState.channel) {
        let guild = client.guilds.cache.get(oldState.guild.id);
        if (!guild) return;
        await TempDB.set(
          client.user?.id + "_" + guild?.id + "_" + newState?.id,
          true,
        );

        const settings = TempSettingsDB.get(
          `TempVoice_${guild.id}_${client.user.id}`,
        );
        if (!settings) return;

        const voiceChannelId = settings.voiceChannelId;
        const categoryId = settings.voiceCategory;

        if (newState.channel.id === voiceChannelId) {
          const category = guild.channels.cache.get(categoryId);
          if (!category) return;

          const startTime = moment().format("YYYY-MM-DD HH:mm:ss");
          const previousChannel = TempCatchDB.get(
            `Channel_${guild.id}_${client.user.id}`,
          );

          try {
            if (previousChannel && previousChannel.channel) {
              const oldChannel = guild.channels.cache.get(
                previousChannel.channel,
              );
              if (oldChannel) await oldChannel.delete();
            }

            const newVoiceChannel = await guild.channels.create({
              name: `${newState.member.user.username}'s Room`,
              type: ChannelType.GuildVoice,
              parent: category.id,
              userLimit: 10,
              reason: "Temporary voice channel created.",
            });

            TempCatchDB.set(
              `Channel_${guild.id}_${client.user.id}_${newVoiceChannel.id}`,
              {
                channel: newVoiceChannel.id,
                owner: newState.member.user.id,
                voiceCategory: category.id,
                time: startTime,
              },
            );

            await newState.member.voice.setChannel(newVoiceChannel);
          } catch (error) {
            console.error("Error creating temporary voice channel:", error);
          }
        }
      }

      if (oldState.channel && !newState.channel) {
        let guild = client.guilds.cache.get(oldState.guild.id);
        if (!guild) return;
        await TempDB.delete(
          client.user?.id + "_" + guild?.id + "_" + oldState?.id,
        );

        const previousChannel = TempCatchDB.get(
          `Channel_${guild.id}_${client.user.id}_${oldState.channel.id}`,
        );

        if (previousChannel && previousChannel.channel) {
          const oldChannel = guild.channels.cache.get(previousChannel.channel);

          try {
            await TempCatchDB.delete(
              `Channel_${guild.id}_${client.user.id}_${oldState.channel.id}`,
            );
            if (oldChannel) {
              await oldChannel.delete();
            } else {
              return;
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
    }

    if (hasLog) {
      if (joinLog && !oldState.channel && newState.channel) {
        let guild = client.guilds.cache.get(oldState.guild.id);
        if (!guild) return;

        const color = guild.members.me.displayColor || joinLog.color || "Green";
        let channel =
          (await oldState.guild.channels.cache.get(joinLog.channel)) ||
          (await oldState.guild.channels.fetch(joinLog.channel).catch());
        if (!channel) return;

        let embed = new EmbedBuilder()
          .setColor(color)
          .setAuthor({
            name: oldState.guild.name,
            iconURL: oldState.guild.iconURL({ dynamic: true }),
          })
          .setFooter({
            iconURL: oldState.guild.iconURL({ dynamic: true }),
            text: oldState.guild.name,
          })
          .setTimestamp()
          .setDescription(
            reply.Log.Reply24.replace("[USER]", `<@!${newState?.id}>`).replace(
              "[CHANNEL]",
              newState.channel.name,
            ),
          );

        channel.send({ embeds: [embed] });
      }

      if (leaveLog && oldState.channel && !newState.channel) {
        let guild = client.guilds.cache.get(oldState.guild.id);
        if (!guild) return;

        const color =
          guild.members.me.displayColor || leaveLog.color || "Green";
        let channel =
          (await oldState.guild.channels.cache.get(leaveLog.channel)) ||
          (await oldState.guild.channels.fetch(leaveLog.channel).catch());
        if (!channel) return;

        let embed = new EmbedBuilder()
          .setColor(color)
          .setAuthor({
            name: oldState.guild.name,
            iconURL: oldState.guild.iconURL({ dynamic: true }),
          })
          .setFooter({
            iconURL: oldState.guild.iconURL({ dynamic: true }),
            text: oldState.guild.name,
          })
          .setTimestamp()
          .setDescription(
            reply.Log.Reply25.replace("[USER]", `<@!${oldState?.id}>`).replace(
              "[CHANNEL]",
              oldState.channel.name,
            ),
          );

        channel.send({ embeds: [embed] });
      }

      // Admin force-disconnect (audit MEMBER_DISCONNECT = 27)
      let disconnectLog =
        db.get(
          `member-disconnected_${oldState.guild?.id}_${client.user.id}`,
        ) || null;
      if (
        disconnectLog?.channel &&
        oldState.channel &&
        !newState.channel
      ) {
        try {
          const audit = await oldState.guild
            .fetchAuditLogs({ type: 27, limit: 1 })
            .catch(() => null);
          const info = audit?.entries?.first?.();
          const recent =
            info &&
            info.target?.id === oldState.id &&
            Date.now() - info.createdTimestamp < 15_000;
          if (recent) {
            let guild = client.guilds.cache.get(oldState.guild.id);
            if (guild) {
              const color =
                guild.members.me?.displayColor ||
                disconnectLog.color ||
                "Green";
              let channel =
                oldState.guild.channels.cache.get(disconnectLog.channel) ||
                (await oldState.guild.channels
                  .fetch(disconnectLog.channel)
                  .catch(() => null));
              if (channel) {
                let embed = new EmbedBuilder()
                  .setColor(color)
                  .setAuthor({
                    name: oldState.guild.name,
                    iconURL: oldState.guild.iconURL({ dynamic: true }),
                  })
                  .setFooter({
                    iconURL: info.executor?.avatarURL?.({ dynamic: true }),
                    text: info.executor?.username || oldState.guild.name,
                  })
                  .setTimestamp()
                  .setDescription(
                    (
                      reply?.Log?.Reply13 ||
                      "**[USER] left voice channel `[CHANNEL]` .**"
                    )
                      .replace("[USER]", `<@!${oldState?.id}>`)
                      .replace("[CHANNEL]", oldState.channel.name),
                  );
                if (info.executor) {
                  embed.addFields({
                    name: reply?.Log?.Field1?.name || "Moderator",
                    value: (reply?.Log?.Field1?.value || "[AUTHOR]").replace(
                      "[AUTHOR]",
                      info.executor,
                    ),
                    inline: true,
                  });
                }
                channel.send({ embeds: [embed] }).catch(() => {});
              }
            }
          }
        } catch (_) {}
      }

      if (
        (voiceStateLog && oldState.channel !== newState.channel) ||
        oldState.mute !== newState.mute ||
        oldState.deaf !== newState.deaf
      ) {
        let guild = client.guilds.cache.get(oldState.guild.id);
        if (!guild) return;

        const color =
          guild.members.me.displayColor || voiceStateLog.color || "Green";
        let channel =
          (await oldState.guild.channels.cache.get(voiceStateLog.channel)) ||
          (await oldState.guild.channels.fetch(voiceStateLog.channel).catch());
        if (!channel) return;

        let embed = new EmbedBuilder()
          .setColor(color)
          .setAuthor({
            name: oldState.guild.name,
            iconURL: oldState.guild.iconURL({ dynamic: true }),
          })
          .setFooter({
            iconURL: oldState.guild.iconURL({ dynamic: true }),
            text: oldState.guild.name,
          })
          .setTimestamp();

        if (
          oldState.channel &&
          newState.channel &&
          oldState.channel.id !== newState.channel.id
        ) {
          embed.setDescription(
            reply.Log.Reply26.replace("[USER]", `<@!${oldState?.id}>`)
              .replace("[FROM_CHANNEL]", oldState.channel?.name)
              .replace("[TO_CHANNEL]", newState.channel?.name),
          );
          channel.send({ embeds: [embed] });
        } else if (oldState.mute !== newState.mute) {
          embed.setDescription(
            reply.Log.Reply27.replace("[USER]", `<@!${oldState?.id}>`).replace(
              "[MUTE_STATUS]",
              newState.mute ? words.word1 : words.word2,
            ),
          );
        } else if (oldState.deaf !== newState.deaf) {
          embed.setDescription(
            reply.Log.Reply28.replace("[USER]", `<@!${oldState?.id}>`).replace(
              "[DEAF_STATUS]",
              newState.deaf ? words.word3 : words.word4,
            ),
          );
          channel.send({ embeds: [embed] });
        }
      }
    }
  } catch (error) {}
};
