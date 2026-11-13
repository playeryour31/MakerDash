const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

const moment = require("moment-timezone");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const Prices = new Database("/Database/BotMaker/Prices.json");
const IdsData = new Database("/Database/BotMaker/IDs.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const TokenDB = new Database("/Database/Others/UnusedTokens.json");
const db2 = new Database("/Database/Others/Tokens.json");
const Lan = new Database("/Database/Others/Language.json");
const runDB = new Database("/Database/BotMaker/RunBots.json");
const prefixDB = new Database("/Database/Others/PrefixData");
const OwnerDB = new Database("/Database/Others/OwnerData");
const config = require("../../Resources/Config.json");
const commands = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Commands.json'));
const bots = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Bots.json'));
const Colors = require("../../Resources/Colors.json");
const {
  syncBotsToApiBackground,
  setRunningViaApiBackground,
} = require('../../../src/shared/services/tokensWriteBridge');

module.exports = {
  name: "modal-purches-bot",
  ownerOnly: false,
  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  run: async (client, interaction) => {
    try {
      // Prefer early defer from interactionCreate; fall back here if needed
      if (!interaction.deferred && !interaction.replied) {
        try {
          await interaction.deferReply({ ephemeral: true });
        } catch (ackErr) {
          if (ackErr?.code === 10062) {
            console.warn(
              "[modal-purches-bot] interaction expired before defer (10062)",
            );
            return;
          }
          throw ackErr;
        }
      }

      const balanceSchema = require("../../../Schema/Balance");
      const botbuildingdb = new Database("/Database/Others/Building.json");
      let type = interaction.customId.split("_")[0]?.trim();
      let status = interaction.customId.split("_")[2]?.trim();
      let botCommands = [];
      const bot = bots.get(type) || { name: "خاص" };

      if (type !== "Custom") {
        let configCommands = commands.get("config");
        if (configCommands) botCommands.push(...configCommands);
        if (commands.has(type)) {
          let commandIDs = commands.get(type);
          commandIDs.forEach((comID) => {
            let com = commands.get(comID);
            if (com) botCommands.push(com);
          });
        }
      } else {
        let configCommands = commands.get("config");
        if (configCommands) botCommands.push(...configCommands);
        let selectedCommandIDs =
          botbuildingdb.get(`buildBot_${interaction.user.id}`) || [];
        selectedCommandIDs.forEach((comID) => {
          let com = commands.get(comID);
          if (com) botCommands.push(com);
        });
      }
      const NodeID = IdsData.get(`NodeID`) || 1;

      const { ensureBalance } = require("../../../src/shared/services/balanceService");
      let userdata = await ensureBalance(
        interaction.user.id,
        interaction.guild.id,
      );
      let usercoins = Number(userdata?.balance) || 0;
      let botPrice = 0;

      if (type === "Custom") {
        botCommands.forEach(() => {
          botPrice += 10;
        });
        if (status !== "our") {
          botPrice = botPrice > 0 ? botPrice / 2 : 5;
        }
        if (!botPrice) botPrice = 5;
      } else {
        const basePrice =
          Prices.get(`${bot.priceKey}_${interaction.guild.id}`) || 10;
        botPrice = status === "our" ? basePrice : basePrice / 2;
      }
      console.log("botPrice =", botPrice);

      const prefix = interaction.fields.getTextInputValue("prefix");
      const server = interaction.fields.getTextInputValue("server");
      const owner = interaction.fields.getTextInputValue("owner");
      const language = interaction.fields.getTextInputValue("language");
      let tokener;
      if (status !== "our")
        tokener = interaction.fields.getTextInputValue("token");
      let token;
      let tokens = [];
      if (tokener) {
        const allTokens = db2.get("Bots") || [];
        const found = allTokens.find((bot) => bot.Token === tokener);
        if (found) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription(
                  "## التوكن قيد الاستخدام بالفعل\n-# هذا التوكن قيد الاستخدام بالفعل بواسطة بوت آخر. يرجى تقديم توكن مختلف.",
                ),
            ],
            ephemeral: true,
          });
          return;
        }
      }

      if (tokener) {
        try {
          const client1 = new Client({
            intents: [
              GatewayIntentBits.Guilds,
              GatewayIntentBits.GuildMessages,
              GatewayIntentBits.GuildMessageReactions,
              GatewayIntentBits.GuildMessageTyping,
              GatewayIntentBits.MessageContent,
            ],
            shards: "auto",
            partials: [
              Partials.Message,
              Partials.Channel,
              Partials.GuildMember,
            ],
          });

          await client1.login(tokener);

          if (
            !client1.ws ||
            !client1.options.intents ||
            client1.options.intents.size === 0
          ) {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(Colors.Warn)
                  .setDescription(
                    `## التوكن غير مدعوم\nالتوكن غير مفعل الخيارات اومفقودة أو غير ممكّنة. الرجاء تمكين الانتيتيس الضرورية وحاول مرة أخرى لاحقًا.`,
                  ),
              ],
              ephemeral: true,
            });
            client1.destroy();
            return;
          }

          token = tokener;
        } catch (err) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(Colors.Warn)
                .setDescription(
                  `## التوكن غير مدعوم\nالتوكن غير مفعل الخيارات اومفقودة أو غير ممكّنة. الرجاء تمكين الانتيتيس الضرورية وحاول مرة أخرى لاحقًا.`,
                ),
            ],
            ephemeral: true,
          });
          return;
        }
      } else {
        tokens = TokenDB.get(`Tokens`) || [];
        token = tokens[0];

        if (!token) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(Colors.Yellow)
                .setDescription(
                  "## لا يوجد توكنات بلمخزون\nلا توجد توكنات متاحة. تواصل مع الادارة و حاول في وقت لاحق.",
                ),
            ],
            ephemeral: true,
          });

          return;
        }
        // TokenDB.pull(`Tokens`, token);
      }

      if (language !== "En" && language !== "Ar") {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Warn)
              .setDescription(
                `## لغة غير مدعومة\nلقد أدخلت لغة غير مدعومة. الرجاء تحديد إما الإنجليزية (En) أو العربية (Ar).`,
              ),
          ],
          ephemeral: true,
        });
      }

      if (isNaN(owner)) {
        const embed = new EmbedBuilder()
          .setColor(Colors.RedWarn)
          .setDescription(
            "## معرف المالك البوت غير صالح\nلقد قمت بإدخال معرف مالك البوت غير صالح\nمثال: **941085346886717480**.",
          );
        return interaction.editReply({ embeds: [embed], ephemeral: true });
      }

      if (prefix === "/") {
        const embed = new EmbedBuilder()
          .setColor(Colors.RedWarn)
          .setDescription(
            "## بادئة غير صحيحه \nلا يمكنك اختيار `/` كبادئة للبوت.",
          );
        return interaction.editReply({ embeds: [embed], ephemeral: true });
      }

      if (usercoins < botPrice) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.RedWarn)
              .setDescription(
                `## رصيد غير كافٍ\nسعر البوت **${botPrice}** ورصيدك الحالي **${usercoins}**.\nاشحن رصيدك ثم حاول مرة أخرى.`,
              ),
          ],
          ephemeral: true,
        });
      }

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.LighGreen)
            .setDescription(
              `## <:signcheck:1293713968266874952> تم الشراء بنجاح\n تم شراء البوت الخاص بك بنجاح وسيتم إرساله إليك قريبًا. يرجى الانتظار قليلا.`,
            ),
        ],
        ephemeral: true,
      });

      const data = await BotMakerDB.get(`BotMakerData_${interaction.guild.id}`);
      const logs = data?.sellslog;
      const logchannel = logs
        ? await client.channels.cache.get(logs)
        : null;
      const AdminChannel = await client.channels.cache.get(
        config.LogChannels.AdminsLog,
      );

      userdata.balance = usercoins - botPrice;
      userdata.coins = userdata.balance;
      await balanceSchema.updateOne(
        { userid: interaction.user.id, guild: interaction.guild.id },
        { balance: userdata.balance, coins: userdata.coins },
        { upsert: true },
      );

      userdata.save().then(async () => {
        if (!tokener) {
          TokenDB.pull(`Tokens`, token);
        }

        const client1 = new Client({
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageTyping,
            GatewayIntentBits.MessageContent,
          ],
          shards: "auto",
          partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
        });

        if (tokens.length <= 20) {
          if (AdminChannel) {
            let embed = new EmbedBuilder()
              .setColor(Colors.Yellow)
              .setTitle(`Warning`)
              .setDescription(
                `Only **${tokens.length - 1}** unused tokens remaining.`,
              )
              .setFooter({
                text: `Please renew the tokens as soon as possible.`,
              })
              .setTimestamp();
            AdminChannel.send({ embeds: [embed] });
          }
        }

        const BotID = IdsData.get(`${type}ID`) || 1;
        const purchasesID = IdsData.get(`PurchasesID`) || 1;

        // mainDb Database.set is sync (no Promise)
        IdsData.set(`${type}ID`, BotID + 1);
        IdsData.set(`PurchasesID`, purchasesID + 1);

        client1.login(token).then(async () => {
          let buyerembed;
          if (type !== "Custom") {
            buyerembed = new EmbedBuilder()
              .setDescription(
                `## تم الشراء بوت ${bot.name} بنجاح!
-# مالك البوت : <@!${owner}>
-# معرف البوت : ${client1.user.id}
-# رقم الفاتورة : ${purchasesID}-${BotID}
-# البادئة : ${prefix}
-# السعر : $${botPrice}`,
              )
              .addFields({
                name: " ",
                value: `-# شكرا لك على الشراء من خادم **فولفو**!`,
              })
              .setColor(Colors.Main);
          } else {
            buyerembed = new EmbedBuilder()
              .setDescription(
                `## تم بناء بوت خاص بنجاح!
-# مالك البوت : <@!${owner}>
-# معرف البوت : ${client1.user.id}
-# رقم الفاتورة : ${purchasesID}-${BotID}
-# البادئة : ${prefix}
-# السعر : $${botPrice}`,
              )
              .addFields({
                name: " ",
                value: `-# شكرا لك على الشراء من خادم **فولفو**!`,
              })
              .setColor(Colors.Main);
          }
          if (logs) {
            try {
              const embed = new EmbedBuilder()
                .setColor(Colors.Main)
                .setDescription(
                  `${bot.emoji || ""} تم شراء بوت ${bot.name} بنجاح بواسطة **${interaction.user.username}**.`,
                );
              logchannel.send({ embeds: [embed] });
            } catch (error) {}
          }

          if (data.role) {
            try {
              await interaction.member.roles.add(data.role);
            } catch (error) {}
          }

          const startTime = moment().format("YYYY-MM-DD HH:mm:ss");
          const endTime = moment()
            .add(30, "days")
            .format("YYYY-MM-DD HH:mm:ss");

          let dashboardAccess = null;
          try {
            const {
              ensureBotAccess,
            } = require("../../../src/shared/services/dashboardAccessService");
            dashboardAccess = ensureBotAccess({
              clientId: client1.user.id,
              type,
              ownerId: interaction.user.id,
              purchasesId: purchasesID,
              guildId: server || null,
            });
          } catch (e) {
            console.error("dashboard access create failed:", e?.message || e);
          }

          const inviteButton = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setURL(
                `https://discord.com/api/oauth2/authorize?client_id=${client1.user.id}&permissions=8&scope=bot%20applications.commands`,
              )
              .setLabel(`اضافه البوت`)
              .setDisabled(false),
            ...(dashboardAccess?.dashboardUrl
              ? [
                  new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(dashboardAccess.dashboardUrl)
                    .setLabel(`لوحة التحكم`)
                    .setDisabled(false),
                ]
              : []),
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setURL(
                `https://canary.discord.com/channels/1131928626003202171/1189637363073286164`,
              )
              .setLabel(`قيمنا`)
              .setDisabled(false),
          ]);

          if (dashboardAccess?.dashboardUrl) {
            buyerembed.addFields({
              name: "رابط الداشبورد الخاص",
              value: `[افتح لوحة التحكم](${dashboardAccess.dashboardUrl})\n-# رابط خاص ببوتك — لا تشاركه.`,
            });
          }

          interaction.user
            .send({ embeds: [buyerembed], components: [inviteButton] })
            .catch((err) => {
              const inviteButton = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                  .setStyle(ButtonStyle.Link)
                  .setURL(
                    `https://discord.com/api/oauth2/authorize?client_id=${client1.user.id}&permissions=8&scope=bot%20applications.commands`,
                  )
                  .setLabel(`اضافه البوت`)
                  .setDisabled(false),
                ...(dashboardAccess?.dashboardUrl
                  ? [
                      new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(dashboardAccess.dashboardUrl)
                        .setLabel(`لوحة التحكم`)
                        .setDisabled(false),
                    ]
                  : []),
                new ButtonBuilder()
                  .setStyle(ButtonStyle.Link)
                  .setURL(
                    `https://canary.discord.com/channels/1131928626003202171/1189637363073286164`,
                  )
                  .setLabel(`قيمنا`)
                  .setDisabled(false),
                new ButtonBuilder()
                  .setCustomId(`resendbot_${interaction.user.id}`)
                  .setStyle(ButtonStyle.Success)
                  .setLabel(`ارسال`)
                  .setDisabled(false),
              ]);

              if (AdminChannel) {
                let embed = new EmbedBuilder()
                  .setColor(Colors.Red)
                  .setTitle(`Error Sending Bot Details to Client`)
                  .setDescription(
                    `The client: ${interaction.user}\nReason: DM is closed`,
                  )
                  .addFields(
                    {
                      name: "<:user:1314653195846287381> Owner",
                      value: `\`${owner}\``,
                      inline: false,
                    },
                    {
                      name: "<:ID:1312130820537978943> BotID",
                      value: `\`${client1.user.id}\``,
                      inline: false,
                    },
                    {
                      name: "<:ID:1312130820537978943> PurchaseID",
                      value: `\`${purchasesID}\``,
                      inline: false,
                    },
                    {
                      name: "<:Prefix:1317461593931517972> Prefix",
                      value: `\`${prefix}\``,
                      inline: false,
                    },
                    {
                      name: "<:wallet:1317462594814214264> Price",
                      value: `\`$${botPrice}\``,
                      inline: false,
                    },
                  )
                  .setTimestamp();
                AdminChannel.send({
                  embeds: [embed, buyerembed],
                  components: [inviteButton],
                });
              }
            });

          try {
            db2.push(`Bots`, {
              Token: token,
              Owner: owner,
              Buyer: interaction.user.id,
              ClientID: client1.user.id,
              Seller: interaction.guild.id,
              BotID: BotID,
              Type: type,
              Servers: [server],
              Server: server || null,
              guild: server || null,
              Price: botPrice,
              Node: NodeID,
              PurchasesID: purchasesID,
              endTime: endTime,
              startTime: startTime,
              TokenType: status,
              dashboardSlug: dashboardAccess?.slug || null,
            });
            prefixDB.set(`Prefix_${client1.user.id}`, prefix);
            OwnerDB.set(`Owner_${client1.user.id}`, owner);
            Lan.set(client1.user.id, language);
            botbuildingdb.delete(`buildBot_${interaction.user.id}`);
            botbuildingdb.delete(interaction.user.id);
            const commandsData = new Database(
              `/Database/CommandsData/BotsCommands_${client1.user.id}.json`,
            );
            commandsData.set(`commands_${client1.user.id}`, botCommands);
            runDB.set(client1.user.id, true);
            setRunningViaApiBackground(client1.user.id, true);
            syncBotsToApiBackground(db2.get("Bots") || []);
          } catch (error) {
            console.log(`${error}\nToken: ${token}`);
            await interaction
              .editReply({
                content: `An error occurred during the purchase process.\nError in returning coins to your account.`,
              })
              .catch(() => {});
          }
        });
      });
    } catch (error) {
      console.log(error);
      if (interaction.deferred || interaction.replied) {
        await interaction
          .editReply({
            content: "حدث خطأ أثناء إتمام الشراء. حاول مرة أخرى.",
          })
          .catch(() => {});
      }
    }
  },
};
