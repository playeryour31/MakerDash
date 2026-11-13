const { Client, Collection, Discord, EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, ActivityType } = require('discord.js');
const config = require('../Resources/Config.json');
const Colors = require('../Resources/Colors.json');
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const fs = require("fs");
const path = require('path');
const moment = require('moment-timezone');
const db2 = new Database("/Database/Others/Tokens.json");
const db222 = new Database("/Database/Others/Expired.json");
const Dscs = new Database("/Database/Tokens/Expired-Tokens.json");
const boter = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Bots.json'));

const parseMoment = (value) => {
    if (!value) return moment.invalid();
    return moment(value, ['YYYY-M-D HH:mm:ss', 'YYYY-MM-DD HH:mm:ss', 'YYYY-M-D H:mm:ss', 'YYYY-MM-DD H:mm:ss'], true);
};
const CoinsDB = new Database("/Database/Backups/Coins.json");
const archiver = require('archiver');
const rundb = new Database("./Database/BotMaker/RunBots.json");
const Makers = new Database("./Database/Others/BotMakerTokens.json");

const { createLogger } = require('../../src/shared/utils/logger');
const log = createLogger('Main');
const { syncBotsToApiBackground } = require('../../src/shared/services/tokensWriteBridge');

/**
 * 
 * @param {Client} client 
 */
module.exports.run = async (client) => {
    client.user.setPresence({
        activities: [
            {
                name: 'Volyx Maker Manger',
                type: ActivityType.Playing,
            }
        ],
        status: "online"
    });

    try {
        log.success(`${client.user.username} online`, `(${client.user.id})`);


setInterval(async () => {
    const Log = client.channels.cache.get(config.LogChannels.ExpireChannels);
    const WarnLog = Log;
    const TokenDB = new Database('/Database/Others/UnusedTokens.json');
    const lifecycle = require('../../src/shared/services/subscriptionLifecycle');
    const deps = {
      db2,
      db222,
      rundb,
      tokenPoolDb: TokenDB,
      expiredTokensDb: Dscs,
    };

    try {
      let bots = db2.get('Bots') || [];
      if (!Array.isArray(bots)) bots = [];

      for (const bot of [...bots]) {
        const { ClientID, Type, PurchasesID, Owner } = bot;
        const ownerId = Array.isArray(Owner) ? Owner[0] : Owner;
        const BotOwner =
          client.users.cache.get(ownerId) ||
          (await client.users.fetch(ownerId).catch(() => null));
        const botMeta = boter.get(Type) || { name: 'خاص' };

        const actions = await lifecycle.processCustomerBot(bot, deps);
        for (const action of actions) {
          if (action.type === 'warn') {
            const embed = new EmbedBuilder()
              .setColor('Yellow')
              .setTitle(`سينتهي اشتراك بوت ${botMeta.name} الخاص بك خلال 3 أيام`)
              .setDescription(
                `**مرحبًا، <@!${Owner}>!**\nسينتهي اشتراك البوت الخاص بك مع **<@!${ClientID}>** خلال **3 أيام**. يرجى تجديده لتجنب أي انقطاع في الخدمة.`,
              )
              .setTimestamp();
            const Row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('d')
                .setLabel('شكرا للتعامل مع فــولـفــو')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setURL(
                  'https://discord.com/channels/1245696740649205781/1245696741366562899',
                )
                .setEmoji('<:link:1314167326886596660>')
                .setStyle(ButtonStyle.Link),
            );
            if (BotOwner) {
              await BotOwner.send({ embeds: [embed], components: [Row] }).catch(
                (err) => {
                  if (WarnLog) {
                    WarnLog.send({
                      embeds: [
                        new EmbedBuilder()
                          .setColor('Red')
                          .setTitle('Error Sending Warning to User')
                          .addFields(
                            { name: 'User', value: `<@!${ownerId}>`, inline: true },
                            {
                              name: 'Error',
                              value: `\`\`\`${err.message}\`\`\``,
                              inline: true,
                            },
                          )
                          .setTimestamp(),
                      ],
                    });
                  }
                },
              );
            }
            if (Log) {
              Log.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0xffcc00)
                    .setTitle('User Warned')
                    .setDescription(
                      `**Bot Type**: ${Type}\n**Bot Owner**: <@!${Owner}>\n**Client**: <@!${ClientID}>\n**Purchase ID**: **${PurchasesID}**\n-# Please renew — 3 days before expiry.`,
                    )
                    .setTimestamp(),
                ],
              });
            }
          }
          if (action.type === 'grace') {
            const until = action.graceUntil
              ? action.graceUntil.format('YYYY-MM-DD HH:mm:ss')
              : '3 days';
            if (Log) {
              Log.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor('Orange')
                    .setTitle('Subscription Entered Grace (Danger)')
                    .setDescription(
                      `**Bot stopped — 3-day grace period.**\n**Bot Type**: ${Type}\n**Bot Owner**: <@!${Owner}>\n**Client ID**: <@!${ClientID}>\n**Grace until**: ${until}\nRenew within grace to restore; otherwise the bot will be purged.`,
                    )
                    .setTimestamp(),
                ],
              });
            }
            if (BotOwner) {
              const embed = new EmbedBuilder()
                .setColor('Orange')
                .setTitle('فترة خطر — انتهى الاشتراك')
                .setDescription(
                  `مرحبًا، <@${ownerId}>!\nانتهى اشتراك بوت **${botMeta.name}**.\nالبوت متوقف الآن ولديك **3 أيام** للتجديد قبل الحذف النهائي.`,
                )
                .setTimestamp();
              BotOwner.send({ embeds: [embed] }).catch(() => {});
            }
          }
          if (action.type === 'purge') {
            if (Log) {
              Log.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('Subscription Purged')
                    .setDescription(
                      `**Grace expired — bot fully removed.**\n**Bot Type**: ${Type}\n**Bot Owner**: <@!${Owner}>\n**Client ID**: <@!${ClientID}>\n**Purchase ID**: **${PurchasesID}**`,
                    )
                    .setTimestamp(),
                ],
              });
            }
            if (BotOwner) {
              const embed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('لقد انتهت صلاحية اشتراكك في البوت')
                .setDescription(
                  `مرحبًا، <@${ownerId}>! انتهى اشتراك بوت **${botMeta.name}** وانتهت فترة السماح. تم حذف بياناتك بسبب عدم التجديد.`,
                )
                .setTimestamp();
              BotOwner.send({ embeds: [embed] }).catch(() => {});
            }
          }
        }
      }

      // Purge grace snapshots whose window ended
      const gracePurges = await lifecycle.processGraceSnapshots(deps);
      for (const action of gracePurges) {
        if (action.type !== 'purge') continue;
        const snap = action.bot || {};
        const ownerId = Array.isArray(snap.Owner) ? snap.Owner[0] : snap.Owner;
        if (Log) {
          Log.send({
            embeds: [
              new EmbedBuilder()
                .setColor('Red')
                .setTitle('Subscription Purged')
                .setDescription(
                  `**Grace expired — bot fully removed.**\n**Client ID**: <@!${snap.ClientID}>\n**Owner**: <@!${ownerId}>`,
                )
                .setTimestamp(),
            ],
          });
        }
      }
    } catch (error) {
      console.error('An error occurred in the subscription checker:', error);
    }
}, 30_000);


        const backupDetails = [
            { path: "./Database", name: "Maker-DatabaseBackup" },
            { path: "./Maker/Json-Database", name: "Bots-DatabaseBackup" },
            { path: "./Subscriptions/Database", name: "Subscriptions-DatabaseBackup" },
        ];
        const backupFolder = path.resolve(__dirname, "../Backups");
        if (!fs.existsSync(backupFolder)) {
            fs.mkdirSync(backupFolder, { recursive: true });
        }

        const backupChannelID = config.LogChannels.BackupChannel;
        setInterval(() => {
                    const startTime = Date.now();

            try {
                let backupChannel = client.channels.cache.get(backupChannelID);
                if (!backupChannel) {
                    console.error("backupChannelID not found");
                    return;
                }
                if (!fs.existsSync(backupFolder)) {
                    fs.mkdirSync(backupFolder);
                }

                backupDetails.forEach(filePath => {
                    if (!filePath.path || !filePath.name) {
                        console.error(`Error in path or name configuration:`, filePath);
                        return;
                    }

                    // A legacy folder may not exist on a fresh clone
                    // (e.g. Subscriptions/Database after the archive move).
                    // Skip it instead of aborting every other backup.
                    let files;
                    try {
                        files = fs.readdirSync(filePath.path);
                    } catch (err) {
                        console.warn(`Skipping backup for ${filePath.path}: ${err.message}`);
                        return;
                    }
                    if (files.length === 0) {
                        console.error(`The folder ${filePath.path} is empty. Backup will not be created.`);
                        return;
                    }

                    const zipFileName = `${filePath.name}-${moment().format("YYYY-MM-DD_HH-mm-ss")}.zip`;
                    const zipFilePath = path.join(backupFolder, zipFileName);
                    const output_stream = fs.createWriteStream(zipFilePath);
                    const archive = archiver("zip", { zlib: { level: 9 } });
                    let archiveStatus = "Success";

                    output_stream.on("close", () => {
                        const formattedDate = moment().format("dddd, MMMM Do YYYY, h:mm:ss A");
                        const endTime = Date.now();
                        const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
                        const embed = new EmbedBuilder()
                            .setColor(archiveStatus === "Success" ? "Green" : "Red")
                            .setTitle("Comprehensive Backup Report ( " + filePath.name +" )")
                            .setDescription(`**Backup Summary:**
                            - **Folder Name:** ${filePath.name}
                            - **Source Path:** ${filePath.path}
                            - **Backup Date & Time:** ${formattedDate}
                            - **Status:** ${archiveStatus === "Success" ? "Success" : "Failed"}`);

                        if (archiveStatus === "Success") {
                            embed.addFields(
                                {
                                    name: "Total Files Included",
                                    value: `${files.length} files`,
                                    inline: true,
                                },
                                {
                                    name: "Destination",
                                    value: `\`${zipFilePath}\``,
                                    inline: true,
                                },
                                {
                                    name: "Elapsed Time",
                                    value: `${elapsedTime} seconds`,
                                    inline: true,
                                }
                            );
                        } else {
                            embed.addFields(
                                {
                                    name: "Error Details",
                                    value: "An issue occurred during the backup. Please review the logs for more information.",
                                }
                            );
                        }

                        backupChannel.send({
                            embeds: [embed],
                            files: archiveStatus === "Success" ? [zipFilePath] : [],
                        }).catch(console.error);
                    });

                    archive.on("error", (err) => {
                        console.error(`Error creating archive for ${filePath.name}:`, err);
                        archiveStatus = "Failed";
                    });
                    archive.pipe(output_stream);
                    archive.glob("**", { cwd: filePath.path });
                    archive.finalize();
                });

                const backupFiles = fs.readdirSync(backupFolder);
                backupFiles.forEach(file => {
                    const filePath = path.join(backupFolder, file);
                    const stats = fs.statSync(filePath);
                    const fileAge = moment().diff(moment(stats.mtime), 'hours');
                    if (fileAge > 24) {  
                        fs.unlinkSync(filePath);
                    }
                });

            } catch (error) {
                console.log("Unexpected error during backup:", error);
            }
       }, 1200000);

        setInterval(async () => {
            try {
                const { findGuildBalances } = require("../../src/shared/services/balanceService");
                const allUsers = await findGuildBalances(config.Configure.DBGuild);
                if (!allUsers.length) return;

                const time = moment().format('YYYY-MM-DD HH:mm:ss');
                const coinsData = allUsers.reduce((acc, user) => {
                    if (user.userid) { 
                        acc[user.userid] = {
                            Coins: user.balance, 
                            LastUpdated: time 
                        };
                    } else {
                        console.log(`Error: Found undefined userID for user: ${user.userid}`);
                    }
                    return acc;
                }, {});

                await CoinsDB.set("Coins", coinsData);
            } catch (error) {
                console.log("Unexpected error while updating coins:", error);
            }
        }, 20000);
    } catch (error) {
        console.log(error);
    }
};