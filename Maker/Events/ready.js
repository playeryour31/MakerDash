const config = require("../../Main/Resources/Config.json");
const {
  Discord,
  EmbedBuilder,
  ActivityType,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { Database } = require("st.db");
const moment = require("moment");
const _ = require("lodash");
const messages = new Database("./Maker/Resources/LanguagsProvider.json");
const Botlanguage = new Database("/Database/Others/Language.json");
const db222 = new Database("/Database/Others/Expired.json");
const TempDB = require("../lib/featureDb")("temp_role");
const azkarDB = require("../lib/featureDb")("azkar");
const { joinVoiceChannel } = require("@discordjs/voice");
let giveawaydb = require("../lib/featureDb")("giveaway");
const protectiondb = require("../lib/featureDb")("protection");
const applydb = require("../lib/applyDb");
const selfroledb = require("../lib/featureDb")("sys_selfrole");
let ticketdb = require("../lib/featureDb")("ticket");
let ticketdb2 = require("../lib/featureDb")("temp_ticket");
const statusDB = new Database("/Database/BotMaker/Status.json");
const VoicesDB = new Database("./Database/Others/Voices.json");
const {
  getScheduler,
  bindClient,
} = require("../../src/shared/runtime/scheduler");

const ACTIVITY_TYPE_MAP = {
  PLAYING: ActivityType.Playing,
  STREAMING: ActivityType.Streaming,
  LISTENING: ActivityType.Listening,
  WATCHING: ActivityType.Watching,
  COMPETING: ActivityType.Competing,
};

/** Known-good Twitch URL Discord always accepts for purple Streaming status */
const FALLBACK_STREAM_URL = "https://twitch.tv/discord";

function normalizeStreamUrl(raw) {
  const input = String(raw || "").trim();
  if (!input) return "";
  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "twitch.tv") {
      const channel = u.pathname.split("/").filter(Boolean)[0];
      if (!channel) return "";
      return `https://twitch.tv/${encodeURIComponent(channel)}`;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      // Prefer watch?v= links — Discord is strict about YouTube stream URLs
      if (u.pathname === "/watch" && u.searchParams.get("v")) {
        return `https://www.youtube.com/watch?v=${u.searchParams.get("v")}`;
      }
      return u.toString();
    }
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
  } catch {
    return "";
  }
  return "";
}

function buildActivity(name, typeKey, url) {
  const key = String(typeKey || "PLAYING").toUpperCase();
  const type = ACTIVITY_TYPE_MAP[key];
  if (type === undefined) return null;
  const activity = { name: String(name || "").trim(), type };
  if (!activity.name) return null;
  if (type === ActivityType.Streaming || type === 1) {
    activity.type = 1;
    // Discord silently converts Streaming→Playing when the Twitch/YouTube URL
    // fails validation. Always use a known-valid Twitch URL for the purple
    // status; the custom text is still shown as the activity name.
    const userUrl = normalizeStreamUrl(url);
    activity.url = userUrl.includes("youtube.com/watch")
      ? userUrl
      : FALLBACK_STREAM_URL;
  }
  return activity;
}

function applyBotPresence(client, name, typeKey, url, status) {
  if (!client?.user) return false;
  const activity = buildActivity(name, typeKey, url);
  if (!activity) return false;

  const isStreaming = activity.type === 1;
  const presenceStatus = isStreaming
    ? "online"
    : ["online", "idle", "dnd", "invisible"].includes(
          String(status || "").toLowerCase(),
        )
      ? String(status).toLowerCase()
      : "online";

  // One PresenceUpdate packet — do NOT call setStatus afterwards (it can re-send without url)
  client.user.setPresence({
    activities: [
      isStreaming
        ? { name: activity.name, type: 1, url: activity.url }
        : { name: activity.name, type: activity.type },
    ],
    status: presenceStatus,
    afk: false,
  });

  const applied = client.user.presence?.activities?.[0];
  console.log(
    `[presence] ${client.user.username}: type=${applied?.type} name=${applied?.name} url=${applied?.url || "-"}`,
  );
  return true;
}
module.exports.run = async (client) => {
  try {
    const chalk = require("chalk");
    const scheduler = getScheduler();
    const scope = bindClient(client) || `bot:${client.user.id}`;
    // Every timer this bot owns is registered by name under its own scope, so
    // client.destroy() (wrapped in bindClient) cancels them all.
    const every = (name, ms, fn) => scheduler.every(ms, fn, { name, scope });
    const after = (name, ms, fn) =>
      scheduler.after(ms, fn, name ? { name, scope } : { scope });
    console.log(
      `${chalk.bgHex("#0d9488").white.bold(" bot ")} ${chalk.green("✓")} ${client.user.username} online`,
    );

    try {
      const { enforceGuildLock } = require("../lib/guildLock");
      const lock = await enforceGuildLock(client);
      if (lock.locked) {
        console.log(
          `[guild-lock] ${client.user.id} locked to ${lock.locked}` +
            (lock.left ? ` (left ${lock.left} other guild(s))` : ""),
        );
      }
    } catch (err) {
      console.warn(`[guild-lock] ready enforce: ${err?.message || err}`);
    }

    every(
      "afk-voice",
      5000,
      () => {
        const afk = VoicesDB.get(client.user.id) || null;
        if (afk && afk.VoiceChannel) {
          // Don't fight Quran player for the same guild voice connection
          try {
            const { isQuranHoldingVoice } = require("../Utils/Quran/quranPlayer");
            const quran = require("../lib/featureDb")("quran").get(
              `Quran_${client.user.id}`,
            );
            if (
              (quran?.enabled && quran?.voiceChannelId) ||
              isQuranHoldingVoice(client.user.id)
            ) {
              return;
            }
          } catch {
            try {
              const quran = require("../lib/featureDb")("quran").get(
                `Quran_${client.user.id}`,
              );
              if (quran?.enabled && quran?.voiceChannelId) return;
            } catch {
              /* ignore */
            }
          }
          const voiceChannel = client.channels.cache.get(afk.VoiceChannel);
          if (voiceChannel && voiceChannel.type === ChannelType.GuildVoice) {
            try {
              joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
              });
            } catch (error) {
              return;
            }
          } else {
            return;
          }
        }
      },
    );
    const seatioesd = statusDB.get(client.user.id);
    console.log(
      `[presence] saved status for ${client.user.id}:`,
      JSON.stringify(seatioesd || null),
    );

    if (seatioesd) {
      if (seatioesd.Name && seatioesd.Type) {
        // Apply immediately, then again after Discord finishes connecting guilds
        applyBotPresence(
          client,
          seatioesd.Name,
          seatioesd.Type,
          seatioesd.Url,
          seatioesd.Status,
        );
        after("presence-reassert-1", 1500, () => {
          applyBotPresence(
            client,
            seatioesd.Name,
            seatioesd.Type,
            seatioesd.Url,
            seatioesd.Status,
          );
        });
        after("presence-reassert-2", 5000, () => {
          applyBotPresence(
            client,
            seatioesd.Name,
            seatioesd.Type,
            seatioesd.Url,
            seatioesd.Status,
          );
        });
      }
    }

    // Keep Streaming sticky — Discord sometimes drops type 1 back to Playing
    every("streaming-keepalive", 15000, () => {
        try {
          const saved = statusDB.get(client.user.id);
          if (!saved?.Name || !saved?.Type) return;
          if (String(saved.Type).toUpperCase() !== "STREAMING") return;
          const current = client.user?.presence?.activities?.[0];
          const isStreamingNow =
            current &&
            (current.type === ActivityType.Streaming || current.type === 1) &&
            current.url;
          if (!isStreamingNow) {
            applyBotPresence(
              client,
              saved.Name,
              "STREAMING",
              saved.Url,
              "online",
            );
          }
        } catch (err) {
          console.log("Streaming keep-alive error:", err?.message || err);
        }
      });

    every("expiry-purge", 30000, () => {
        try {
          const status = db222.get(`Expired_${client.user.id}`) || null;
          if (!status) return;
          // pgDatabase/platformCache delete is sync (no Promise) — do not chain .then()
          Promise.resolve(db222.delete(`Expired_${client.user.id}`))
            .then(() => {
              client.guilds.cache.forEach((guild) => {
                guild.leave().catch(() => {});
              });
              setTimeout(() => {
                Promise.resolve(client.user.setAvatar(null))
                  .then(() => client.user.setUsername("VolvoBots"))
                  .then(() =>
                    setTimeout(() => {
                      Promise.resolve(client.destroy()).then(() => {
                        console.log("Bot has been destroyed");
                      });
                    }, 10000),
                  )
                  .catch((err) => console.log("Expire Errors: " + err));
              }, 10000);
            })
            .catch((err) => console.log("Expire Errors: " + err));
        } catch (err) {
          console.log("Expire Errors: " + err);
        }
      });

    every("giveaway-tick", 7000, async () => {
        const language = (await Botlanguage.get(client.user?.id)) || "En";
        const reply = await messages.get(language);
        const Timer =
          giveawaydb.get("RunningGiveaway_" + client.user?.id) || [];
        if (Timer.length > 0) {
          for (const data2 of Timer) {
            let time = data2.Time;
            const Message = data2.messageID;
            const GuildID = data2.guild;
            const Winners = data2.Winners;
            const Prize = data2.Prize;
            const guild = client.guilds.cache.get(data2.guild);
            if (!guild) continue;
            const currentTime = moment().format("YYYY-MM-DD HH:mm:ss");

            const giveawaychannel = client.channels.cache.get(data2.Channel);
            if (!giveawaychannel) continue;
            const giveawaymessage = giveawaychannel.messages.cache.get(
              data2.messageID,
            );
            if (!giveawaymessage) continue;
            if (
              moment(currentTime).isAfter(time) &&
              data2.Status === "false" &&
              data2.Ended === "true"
            ) {
              continue;
            } else if (
              moment(currentTime).isAfter(time) &&
              data2.Status === "true" &&
              data2.Ended === "false"
            ) {
              const winnersCount = Winners;
              const participants = giveawaydb.get(
                GuildID + "_" + Message + "_Members",
              );
              const winners = _.sampleSize(
                participants,
                Math.min(winnersCount, participants?.length),
              );

              let winners2 = [];
              let winners3 = [];
              winners.forEach(async (winner) => {
                winners2.push("<@!" + winner + ">");
                winners3.push(`${winner}`);
              });

              if (winners2.length > 0) {
                data2.winner = winners2;
                data2.Reroll = winners3;
                giveawaychannel.send({
                  content: `${reply.Giveaway.Reply9.replace("[WINNERS]", winners2).replace("[PRIZE]", Prize)} [↗](${giveawaymessage.url})`,
                });
              } else {
                giveawaychannel.send({
                  content: `${reply.Giveaway.Reply10} [↗](${giveawaymessage.url})`,
                });
              }

              const GiveawayButton = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                  .setCustomId(`entries`)
                  .setLabel(`View entries`)
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(false),
              ]);

              const embedMessage = giveawaymessage.embeds[0];
              const updatedDes = embedMessage.description.replace(
                "Ends",
                "Ended",
              );
              const updatedDescription = updatedDes.replace(
                /Winners: \*\*\d+\*\*/,
                "Winners: " + winners2 || "",
              );

              const embed = new EmbedBuilder()
                .setColor(`DarkButNotBlack`)
                .setTitle(giveawaymessage.embeds[0].title)
                .setDescription(updatedDescription);

              data2.Ended = "true";
              data2.Status = "false";
              giveawaymessage.edit({
                embeds: [embed],
                components: [GiveawayButton],
              });
              giveawaydb
                .set(data2.messageID + "_Data", {
                  Winner: winners2,
                  Reroll: winners3,
                  Prize: Prize,
                  channelID: data2.Channel,
                })
                .then(() => {
                  giveawaydb.push(`EndsGiveaway_${client.user.id}`, {
                    Time: data2.Time,
                    RealEndsTime: data2.RealEndsTime,
                    StartedTime: data2.StartedTime,
                    messageID: data2.messageID,
                    channelID: data2.channelID,
                    guild: data2.guild,
                    WinnersCount: winnersCount,
                    Winner: winners2,
                    Reroll: winners3,
                    Prize: Prize,
                  });
                })
                .then(() => {
                  let gg = Timer.filter((s) => s.messageID !== Message);
                  giveawaydb.set("RunningGiveaway_" + client.user?.id, gg);
                });
            }
          }
        }
      });
    every("temp-roles", 1000, async () => {
      try {
        let roles = TempDB.all() || [];
        for (const roleer of roles) {
          const currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
          const entries = Array.isArray(roleer?.data)
            ? roleer.data
            : roleer?.data
              ? [roleer.data]
              : [];
          for (const role of entries) {
            if (!role || typeof role !== "object") continue;

            const { StartTime, EndTime, Guild, User, Role, Admin, Reason } =
              role;
            const guild = client.guilds.cache.get(Guild);
            const member = guild?.members?.cache?.get(User);

            if (moment(currentTime).isAfter(EndTime)) {
              if (member) {
                await member.roles
                  .remove(Role)
                  .then(() => {
                    console.log(`Removed role ${Role} from user ${User}.`);
                  })
                  .catch((err) => {
                    console.error(`Failed to remove role from user: ${err}`);
                  });
              }

              const check = TempDB.get("TempRole") || [];
              const Remove = Array.isArray(check)
                ? check.filter((re) => !(re.User === User && re.Role === Role))
                : [];
              await TempDB.set("TempRole", Remove);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing temporary roles: ${error}`);
      }
    });

    every("protection-timers", 5000, async () => {
        const currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
        const timer =
          protectiondb.get(`protectionTimer_${client.user.id}`) || [];
        if (timer.length) {
          timer.forEach(async (data) => {
            const { ID, action, Time, server, Number } = data;
            if (moment(currentTime).isAfter(Time)) {
              const Remove = timer.filter((re) =>
                moment(currentTime).isBefore(re.Time),
              );
              await protectiondb
                .set(`protectionTimer_${client.user.id}`, Remove)
                .then(() => {
                  const userData =
                    protectiondb.get(
                      "protectionData_" +
                        action +
                        "_" +
                        server +
                        "_" +
                        ID +
                        "_" +
                        client.user.id,
                    ) || 1;
                  if (isNaN(userData)) return;
                  protectiondb.set(
                    "protectionData_" +
                      action +
                      "_" +
                      server +
                      "_" +
                      ID +
                      "_" +
                      client.user.id,
                    userData - 1,
                  );
                });
            }
          });
        }
      });

    every("ticket-create-panel", 3000, () => {
      let data = ticketdb2.get(`Create_Panel_${client.user.id}`) || null;
      if (data) {
        ticketdb2.delete(`Create_Panel_${client.user.id}`);
        let {
          guild,
          channel,
          gategory,
          role,
          message,
          welcome,
          messageType,
          welcomeType,
          buttonName,
          buttonColor,
          buttonEmoji,
        } = data;

        let server = client.guilds.cache.get(guild);
        if (!server) return;
        let panal_channel = server.channels.cache.get(channel);
        if (!panal_channel) return;

        let embed = new EmbedBuilder()
          .setAuthor({
            name: server.name,
            iconURL: server.iconURL({ dynamic: true }),
          })
          .setColor(server.members.me.displayHexColor)
          .setTimestamp()
          .setDescription(message)
          .setFooter({
            text: server.name,
            iconURL: server.iconURL({ dynamic: true }),
          });

        const button = new ActionRowBuilder().addComponents([
          new ButtonBuilder()
            .setCustomId(role + "_" + gategory + "_1" + "_ticket")
            .setStyle(parseInt(buttonColor || 1))
            .setLabel(buttonName),
        ]);
        if (buttonEmoji) {
          button.components[0].setEmoji(buttonEmoji);
        }

        if (messageType.toLowerCase() == "embed") {
          panal_channel
            .send({ embeds: [embed], components: [button] })
            .then(async (msg) => {
              ticketdb.set("ticketData_" + msg.id, {
                panal_channelID: channel,
                panel_message: message,
                buttonsData: {
                  button1: {
                    panal_categoryID: gategory,
                    button_name: buttonName,
                    button_color: buttonColor,
                    button_emoji: buttonEmoji,
                    support_role: role,
                    modals: [],
                    welcome: {
                      message: welcome,
                      type: welcomeType,
                    },
                  },
                },
              });
            })
            .catch(async (error) => {
              console.log(error);
              try {
              } catch {}
            });
        } else {
          panal_channel
            .send({ content: message, components: [button] })
            .then(async (msg) => {
              ticketdb.set("ticketData_" + msg.id, {
                panal_channelID: channel,
                panel_message: message,
                buttonsData: {
                  button1: {
                    panal_categoryID: gategory,
                    button_name: buttonName,
                    button_color: buttonColor,
                    button_emoji: buttonEmoji,
                    support_role: role,
                    modals: [],
                    welcome: {
                      message: welcome,
                      type: welcomeType,
                    },
                  },
                },
              });
            })
            .catch(async (error) => {
              console.log(error);
              try {
              } catch {}
            });
        }
      }
    });
    every("ticket-manage-panel", 3000, async () => {
      let data = ticketdb2.get(`Manage_Panel_${client.user.id}`) || null;
      if (data) {
        ticketdb2.delete(`Manage_Panel_${client.user.id}`);
        let { guild, panelID, channel, message, thumbnail, image } = data;

        let server = client.guilds.cache.get(guild);
        if (!server) return;
        let panal_channel = server.channels.cache.get(channel);
        if (!panal_channel) return;
        let panel_message = await panal_channel.messages
          .fetch(panelID)
          .catch((err) => {});
        if (!panel_message) return;

        if (panel_message.embeds[0]) {
          let embed = new EmbedBuilder()
            .setAuthor(panel_message.embeds[0].author)
            .setColor(panel_message.embeds[0].color)
            .setTimestamp(new Date(panel_message.embeds[0].timestamp))
            .setDescription(message)
            .setFooter(panel_message.embeds[0].footer);
          if (image) embed.setImage(image);
          if (thumbnail) embed.setThumbnail(thumbnail);
          if (!image && panel_message.embeds[0].image)
            embed.setImage(panel_message.embeds[0].image.proxyURL);
          if (!thumbnail && panel_message.embeds[0].thumbnail)
            embed.setThumbnail(panel_message.embeds[0].thumbnail.proxyURL);

          panel_message.edit({ embeds: [embed] });
        } else {
          panel_message.edit({ content: `${message}` });
        }
      }
    });
    every("ticket-manage-button", 3000, async () => {
      let data = ticketdb2.get(`Manage_addbutton_${client.user.id}`) || null;
      if (data) {
        ticketdb2.delete(`Manage_addbutton_${client.user.id}`);
        let {
          guild,
          panelID,
          channel,
          gategory,
          role,
          welcome,
          welcomeType,
          buttonName,
          buttonColor,
          buttonEmoji,
        } = data;

        let server = client.guilds.cache.get(guild);
        if (!server) return;
        let panal_channel = server.channels.cache.get(channel);
        if (!panal_channel) return;
        let panel_message = await panal_channel.messages
          .fetch(panelID)
          .catch((err) => {});
        if (!panel_message) return;
        let ticketData = ticketdb.get("ticketData_" + panelID);

        let panalButton = panel_message.components[0].components;
        if (panalButton.length >= 5) return;

        ticketData.buttonsData[`button${panalButton.length + 1}`] = {
          panal_categoryID: gategory,
          button_name: buttonName,
          button_color: buttonColor,
          button_emoji: buttonEmoji,
          support_role: role,
          modals: [],
          welcome: {
            message: welcome,
            type: welcomeType,
          },
        };
        let nbu = new ButtonBuilder()
          .setCustomId(
            role + "_" + gategory + "_" + (panalButton.length + 1) + "_ticket",
          )
          .setLabel(buttonName)
          .setStyle(parseInt(buttonColor));
        if (buttonEmoji) nbu.setEmoji(buttonEmoji);
        panalButton.push(nbu);

        await panel_message
          .edit({
            components: [new ActionRowBuilder().addComponents(panalButton)],
          })
          .then(() => {
            ticketdb.set("ticketData_" + panelID, ticketData);
          });
      }
    });

    every("protection-whitelist-queue", 3000, async () => {
      let data =
        protectiondb.get(`Protection_Add_Whitelist_${client.user.id}`) || [];
      if (data.length != 0) {
        data.forEach(async (act, i) => {
          let { server, action, user } = act;
          if (i == 0) {
            let filteredData = data.filter(
              (d) =>
                d.user != act.user &&
                d.action != act.action &&
                d.server != act.server,
            );
            protectiondb.set(
              `Protection_Add_Whitelist_${client.user.id}`,
              filteredData,
            );
          }
          let guild = client.guilds.cache.get(server);
          if (!guild) return;
          let member = await guild.members.fetch(user).catch((err) => {});
          if (!member) return;
          let userData =
            protectiondb.get(
              "whiteList_" + server + "_" + member.id + "_" + client.user.id,
            ) || [];
          if (userData.includes(action)) return;
          protectiondb.push(
            "whiteList_" + server + "_" + member.id + "_" + client.user.id,
            action,
          );
        });
      }
    });
    every("apply-create-panel", 3000, async () => {
      let data =
        (await applydb.get(`Create_Applection_${client.user.id}`)) || null;
      if (data) {
        let {
          guild,
          applicationChannel,
          requestsChannel,
          applicationRole,
          applicationMessage,
          applicationMessageType,
          questions,
          embed: embedCfg,
          buttonLabel,
          buttonEmoji,
          buttonColor,
        } = data;
        await applydb.delete(`Create_Applection_${client.user.id}`);
        const language = (await Botlanguage.get(client.user?.id)) || "En";
        const reply = await messages.get(language);
        const {
          buildApplyEmbed,
          buildApplyButton,
          panelRecordFromPayload,
        } = require("../Utils/applyEmbed");

        let server = client.guilds.cache.get(guild);
        if (!server) return;
        let Appchannel = await server.channels
          .fetch(applicationChannel)
          .catch();
        if (!Appchannel) return;

        const button = new ActionRowBuilder().addComponents(
          buildApplyButton(ButtonBuilder, ButtonStyle, {
            requestsChannel,
            applicationRole,
            buttonLabel: buttonLabel || reply.Apply.ButtonName,
            buttonEmoji: buttonEmoji || "",
            buttonColor: buttonColor || "Primary",
          }),
        );

        const msgType = applicationMessageType || "embed";
        const desc = applicationMessage || embedCfg?.description || "";

        const saveRecord = async (appmsg) => {
          await applydb.set(
            "appData_" + appmsg.id + "_" + client.user.id,
            panelRecordFromPayload(appmsg.id, applicationChannel, {
              ...data,
              applicationMessage: desc,
              questions: questions || [],
            }),
          );
        };

        if (
          msgType === "embed" &&
          (desc || embedCfg?.title || embedCfg?.imageUrl)
        ) {
          const embed = buildApplyEmbed(EmbedBuilder, server, {
            message: desc,
            embed: embedCfg || { description: desc, useServerBranding: true },
          });
          Appchannel.send({ embeds: [embed], components: [button] })
            .then(saveRecord)
            .catch(() => {});
        } else if (desc) {
          Appchannel.send({ content: `${desc}`, components: [button] })
            .then(saveRecord)
            .catch(() => {});
        } else {
          Appchannel.send({ components: [button] })
            .then(saveRecord)
            .catch(() => {});
        }
      }
    });
    every("apply-update-panel", 3000, async () => {
      let data =
        (await applydb.get(`Applection_Update_Data_${client.user.id}`)) || null;
      if (data) {
        let {
          guild,
          appStatus,
          appMessage,
          appID,
          questions,
          embed: embedCfg,
          buttonLabel,
          buttonEmoji,
          buttonColor,
          applicationMessageType,
          requestsChannel,
          applicationRole,
        } = data;
        await applydb.delete(`Applection_Update_Data_${client.user.id}`);
        const language = (await Botlanguage.get(client.user?.id)) || "En";
        const reply = await messages.get(language);
        const {
          buildApplyEmbed,
          buildApplyButton,
          panelRecordFromPayload,
        } = require("../Utils/applyEmbed");

        let appData =
          (await applydb.get(`appData_${appID}_${client.user.id}`)) || null;
        if (!appData) return;

        let server = client.guilds.cache.get(guild);
        if (!server) return;
        let Appchannel = await server.channels.fetch(appData.channel).catch();
        if (!Appchannel) return;
        let applectionMessage = await Appchannel.messages
          .fetch(appData.ID)
          .catch(() => null);
        if (!applectionMessage) return;

        const desc =
          appMessage ?? embedCfg?.description ?? appData.message ?? "";
        const msgType =
          applicationMessageType ||
          appData.messageType ||
          (applectionMessage.embeds?.[0] ? "embed" : "message");
        const mergedEmbed = {
          ...(appData.embed || {}),
          ...(embedCfg || {}),
          description: desc,
        };
        const reqCh =
          requestsChannel ||
          appData.requestsChannel ||
          (
            applectionMessage.components?.[0]?.components?.[0]?.customId || ""
          ).split("_")[0];
        const roleId =
          applicationRole ||
          appData.applicationRole ||
          (
            applectionMessage.components?.[0]?.components?.[0]?.customId || ""
          ).split("_")[1];

        const button = new ActionRowBuilder().addComponents(
          buildApplyButton(ButtonBuilder, ButtonStyle, {
            requestsChannel: reqCh,
            applicationRole: roleId,
            buttonLabel:
              buttonLabel || appData.buttonLabel || reply.Apply.ButtonName,
            buttonEmoji:
              buttonEmoji !== undefined && buttonEmoji !== null
                ? buttonEmoji
                : appData.buttonEmoji || "",
            buttonColor: buttonColor || appData.buttonColor || "Primary",
          }),
        );

        try {
          if (msgType === "embed") {
            const embed = buildApplyEmbed(EmbedBuilder, server, {
              message: desc,
              embed: mergedEmbed,
            });
            await applectionMessage.edit({
              content: null,
              embeds: [embed],
              components: [button],
            });
          } else {
            await applectionMessage.edit({
              content: desc || null,
              embeds: [],
              components: [button],
            });
          }
        } catch {
          /* ignore edit errors */
        }

        await applydb.set(
          "appData_" + appData.ID + "_" + client.user.id,
          panelRecordFromPayload(appData.ID, appData.channel, {
            applicationMessage: desc,
            applicationMessageType: msgType,
            questions: questions || [],
            embed: mergedEmbed,
            buttonLabel: buttonLabel || appData.buttonLabel,
            buttonEmoji:
              buttonEmoji !== undefined
                ? buttonEmoji || null
                : appData.buttonEmoji,
            buttonColor: buttonColor || appData.buttonColor || "Primary",
            requestsChannel: reqCh,
            applicationRole: roleId,
          }),
        );
        await applydb.set(
          "applectionStatus_" + appID + "_" + client.user.id,
          appStatus || "on",
        );
      }
    });

    // Delete Apply panel queued from Nest dashboard
    every("apply-delete-panel", 3000, async () => {
      let data =
        (await applydb.get(`Delete_Applection_${client.user.id}`)) || null;
      if (!data) return;
      await applydb.delete(`Delete_Applection_${client.user.id}`);
      const appID = data.appID || data.messageId;
      const channelId = data.channel;
      if (!appID) return;

      try {
        if (channelId) {
          const ch = await client.channels.fetch(channelId).catch(() => null);
          if (ch && typeof ch.messages?.fetch === "function") {
            const msg = await ch.messages.fetch(appID).catch(() => null);
            if (msg) await msg.delete().catch(() => {});
          }
        }
      } catch {
        /* ignore discord delete errors */
      }

      await applydb.delete(`appData_${appID}_${client.user.id}`);
      await applydb.delete(`applectionStatus_${appID}_${client.user.id}`);
      await applydb.delete(`Applied_${appID}_${client.user.id}`);
    });

    every("selfrole-create-panel", 3000, async () => {
      let data = selfroledb.get(`Create_Panel_${client.user.id}`) || null;
      if (data) {
        let {
          guild,
          panelChannel,
          panelRole,
          panelType,
          panelMessage,
          panelMessageType,
          buttonColor,
          compName,
        } = data;
        selfroledb.delete(`Create_Panel_${client.user.id}`);
        const language = (await Botlanguage.get(client.user?.id)) || "En";
        const reply = await messages.get(language);

        let server = client.guilds.cache.get(guild);
        if (!server) return;

        let ch = await server.channels.fetch(panelChannel).catch();
        if (!ch) return;

        let component;
        if (panelType == "buttons") {
          component = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(panelRole + "_role")
              .setStyle(parseInt(buttonColor))
              .setLabel(compName),
          );
        } else {
          component = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("selfrolemenu")
              .setPlaceholder(reply.Selfrole.Reply3)
              .setOptions([
                {
                  label: compName,
                  value: panelRole,
                },
              ]),
          );
        }

        if (panelMessage) {
          if (panelMessageType.toLowerCase() == "embed") {
            const embed = new EmbedBuilder()
              .setColor(server.members.me.displayHexColor || `DarkButNotBlack`)
              .setThumbnail(server.iconURL({ dynamic: true }))
              .setFooter({
                text: server.name,
                iconURL: server.iconURL({ dynamic: true }),
              })
              .setAuthor({
                name: server.name,
                iconURL: server.iconURL({ dynamic: true }),
              })
              .setDescription(panelMessage);

            ch.send({ embeds: [embed], components: [component] });
          } else {
            ch.send({ content: panelMessage, components: [component] });
          }
        } else {
          ch.send({ components: [component] });
        }
      }
    }, 3000);

    function scheduleAzkarPosts(client) {
      const tick = async () => {
        let delayMs = 60_000;
        try {
          const status = azkarDB.get(`Azkar_${client.user.id}`) || null;
          if (status?.enabled === false) {
            after("azkar-tick", delayMs, tick);
            return;
          }
          const theAzkarRoom = status?.Channel || null;
          const mode = status?.Mode || null;
          const intervalMinutes = Math.max(
            1,
            Number(status?.intervalMinutes) || 5,
          );
          const slowdownSeconds = Math.max(
            0,
            Number(status?.slowdownSeconds) || 0,
          );
          delayMs = intervalMinutes * 60_000 + slowdownSeconds * 1000;

          const { Azkar } = require(`../Utils/Azkar/Azkar.json`);
          const pool =
            Array.isArray(status?.selectedAzkar) &&
            status.selectedAzkar.length > 0
              ? status.selectedAzkar
                  .map((n) => Number(n))
                  .filter(
                    (n) => Number.isInteger(n) && n >= 0 && n < Azkar.length,
                  )
              : Azkar.map((_, i) => i);

          if (
            status &&
            (mode === "embed" || mode === "message") &&
            theAzkarRoom &&
            pool.length > 0
          ) {
            const pick = pool[Math.floor(Math.random() * pool.length)];
            const randomZekr = Azkar[pick];

            for (const guild of client.guilds.cache.values()) {
              const theRoom = guild.channels.cache.get(theAzkarRoom);
              if (!theRoom) continue;
              if (mode === "embed") {
                const embed = new EmbedBuilder()
                  .setColor(
                    guild.members.me.displayHexColor || `DarkButNotBlack`,
                  )
                  .setTimestamp()
                  .setThumbnail(`https://i.ibb.co/2cbsmHL/quran.png`)
                  .setFooter({
                    text: `📿 الأذكار اليومية`,
                    iconURL: `https://i.postimg.cc/g0rDXc6q/2714091.png`,
                  })
                  .setDescription(`**\`\`\`${randomZekr}\`\`\`**`);
                await theRoom.send({ embeds: [embed] }).catch(() => {});
              } else {
                await theRoom.send(`\`\`\`${randomZekr}\`\`\``).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.error("[azkar] tick failed:", err?.message || err);
        }
        after("azkar-tick", delayMs, tick);
      };
      tick();
    }

    scheduleAzkarPosts(client);

    // Quran Player — dashboard control queue + reconnect watchdog
    try {
      const { createQuranPlayer } = require("../Utils/Quran/quranPlayer");
      const quranPlayer = createQuranPlayer(client);
      every("quran-watchdog", 10000, () => {
        quranPlayer.watchdog().catch((err) => {
          console.error(
            "[quran] watchdog rejected:",
            err?.message || err,
            err?.stack || "",
          );
        });
      });
    } catch (err) {
      console.error("[quran] player init failed", err?.message || err);
    }

    // Apply dashboard actions (accept/reject queued from Nest API)
    every("dashboard-apply-actions", 3000, async () => {
      try {
        const key = `Dashboard_Apply_Action_${client.user.id}`;
        const queue = (await applydb.get(key)) || [];
        if (!Array.isArray(queue) || queue.length === 0) return;

        const next = [];
        for (const item of queue) {
          try {
            const { action, guildId, channelId, messageId, userId, roleId } =
              item || {};
            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
              next.push(item);
              continue;
            }
            const channel = await guild.channels
              .fetch(channelId)
              .catch(() => null);
            if (!channel || !channel.isTextBased?.()) {
              next.push(item);
              continue;
            }
            const message = await channel.messages
              .fetch(messageId)
              .catch(() => null);
            const member = await guild.members.fetch(userId).catch(() => null);
            const language = (await Botlanguage.get(client.user?.id)) || "En";
            const reply = await messages.get(language);
            let dmMode = (await applydb.get(
              `dm_Mode_${guildId}_${client.user.id}`,
            )) || {
              accept: "off",
              reject: "off",
            };

            if (action === "accept") {
              if (member && roleId) {
                await member.roles.add(roleId).catch(() => {});
                if (dmMode.accept === "on") {
                  const embed = new EmbedBuilder()
                    .setColor("Green")
                    .setTimestamp()
                    .setTitle(
                      reply?.Apply?.Buttons?.accept?.dm?.t || "Accepted",
                    )
                    .setDescription(
                      (reply?.Apply?.Buttons?.accept?.dm?.dec || "Accepted")
                        .replace("[USER]", `<@${client.user.id}>`)
                        .replace("[ROLE]", `<@&${roleId}>`),
                    );
                  member.send({ embeds: [embed] }).catch(() => {});
                }
              }
              if (message?.embeds?.[0]) {
                const embed = EmbedBuilder.from(message.embeds[0])
                  .setColor("Green")
                  .setDescription(
                    `${message.embeds[0].description || ""}\n-# Dashboard accept`,
                  );
                const button = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId(`${userId}_${roleId}_accept`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true)
                    .setLabel("Accept"),
                  new ButtonBuilder()
                    .setCustomId(`${userId}_${roleId}_reject`)
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
                    .setLabel("Reject"),
                );
                await message
                  .edit({ embeds: [embed], components: [button] })
                  .catch(() => {});
              }
            } else if (action === "reject") {
              if (member && dmMode.reject === "on") {
                const embed = new EmbedBuilder()
                  .setColor("Red")
                  .setTimestamp()
                  .setTitle(reply?.Apply?.Buttons?.reject?.dm?.t || "Rejected")
                  .setDescription(
                    reply?.Apply?.Buttons?.reject?.dm?.dec || "Rejected",
                  );
                member.send({ embeds: [embed] }).catch(() => {});
              }
              if (message?.embeds?.[0]) {
                const embed = EmbedBuilder.from(message.embeds[0])
                  .setColor("Red")
                  .setDescription(
                    `${message.embeds[0].description || ""}\n-# Dashboard reject`,
                  );
                const button = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId(`${userId}_${roleId}_accept`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true)
                    .setLabel("Accept"),
                  new ButtonBuilder()
                    .setCustomId(`${userId}_${roleId}_reject`)
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
                    .setLabel("Reject"),
                );
                await message
                  .edit({ embeds: [embed], components: [button] })
                  .catch(() => {});
              }
            }
          } catch (err) {
            console.log("Dashboard apply action error:", err?.message || err);
            next.push(item);
          }
        }
        await applydb.set(key, next);
      } catch (err) {
        console.log("Dashboard apply queue error:", err?.message || err);
      }
    });

    // Apply dashboard audit → Discord logs channel
    every("dashboard-audit-logs", 3500, async () => {
      try {
        const key = `Dashboard_Logs_${client.user.id}`;
        const queue = (await applydb.get(key)) || [];
        if (!Array.isArray(queue) || queue.length === 0) return;

        const next = [];
        for (const item of queue) {
          try {
            const {
              guildId,
              channelId,
              title,
              categoryLabel,
              description,
              actorLine,
              color,
              at,
            } = item || {};
            if (!guildId || !channelId) continue;

            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
              next.push(item);
              continue;
            }
            const channel = await guild.channels
              .fetch(channelId)
              .catch(() => null);
            if (!channel || !channel.isTextBased?.()) {
              next.push(item);
              continue;
            }

            const embed = new EmbedBuilder()
              .setColor(typeof color === "number" ? color : 0x7c3aed)
              .setTitle(title || "Dashboard log")
              .setDescription(description || "—")
              .addFields(
                {
                  name: "Category",
                  value: String(categoryLabel || "—"),
                  inline: true,
                },
                {
                  name: "Actor",
                  value: String(actorLine || "—"),
                  inline: true,
                },
              )
              .setTimestamp(at ? new Date(at) : new Date())
              .setFooter({ text: "Maker Dashboard" });

            await channel.send({ embeds: [embed] }).catch(() => {
              next.push(item);
            });
          } catch (err) {
            console.log("Dashboard log send error:", err?.message || err);
            next.push(item);
          }
        }
        await applydb.set(key, next);
      } catch (err) {
        console.log("Dashboard logs queue error:", err?.message || err);
      }
    });

    // Dashboard bot profile presence (activity / status)
    every("dashboard-profile-presence", 2500, async () => {
      try {
        const key = `Dashboard_Profile_${client.user.id}`;
        const queue = (await applydb.get(key)) || [];
        if (!Array.isArray(queue) || queue.length === 0) return;

        const next = [];
        for (const item of queue) {
          try {
            const name = String(item?.name || "").trim();
            const type = String(item?.type || "PLAYING").toUpperCase();
            const url = String(item?.url || "").trim();
            const status = String(item?.status || "online").toLowerCase();
            const validTypes = [
              "PLAYING",
              "STREAMING",
              "LISTENING",
              "WATCHING",
              "COMPETING",
            ];
            if (!name || !validTypes.includes(type)) continue;

            const activity = buildActivity(name, type, url);
            if (!activity) {
              console.log(
                `Dashboard profile presence skipped: invalid ${type} activity (need Twitch/YouTube URL for Streaming)`,
              );
              continue;
            }

            const ok = applyBotPresence(client, name, type, url, status);
            if (!ok) continue;

            // Re-assert Streaming after Discord processes the first packet
            if (type === "STREAMING") {
              after(null, 2000, () => {
                applyBotPresence(client, name, type, url, "online");
              });
            }

            const presenceStatus = type === "STREAMING" ? "online" : status;

            await statusDB.set(client.user.id, {
              Name: name,
              Type: type,
              Url: type === "STREAMING" ? activity.url || url : url,
              Status: presenceStatus,
            });
          } catch (err) {
            console.log(
              "Dashboard profile presence error:",
              err?.message || err,
            );
            next.push(item);
          }
        }
        await applydb.set(key, next);
      } catch (err) {
        console.log("Dashboard profile queue error:", err?.message || err);
      }
    });
  } catch (error) {
    console.log(error);
  }
};
