const {
  Client,
  Collection,
  Discord,
  createInvite,
  ChannelType,
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
  SlashCommandBuilder,
  REST,
  Routes,
  GatewayCloseCodes,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  Embed,
  ChatInputCommandInteraction,
} = require("discord.js");

const moment = require("moment-timezone");

const { Database } = require("st.db");
const Prices = new Database("./Subscriptions/Database/Others/Prices.json");
const IdsData = new Database("./Database/BotMaker/IDs.json");
const db2 = new Database("./Database/Others/Tokens.json");
const prefixDB = new Database("./Database/Others/PrefixData");
const OwnerDB = new Database("./Database/Others/OwnerData");
const BotMakerDB = new Database("./Database/BotMaker/Data");
const TokenDB = new Database("./Database/Others/UnusedTokens.json");
const runDB = new Database("./Database/BotMaker/RunBots.json");
const config = require("../../../Main/Resources/Config.json");
const Colors = require("../../../Main/Resources/Colors.json");
const bots = new Database("./Main/Resources/Bots.json");
const commands = new Database("./Main/Resources/Commands.json");

module.exports = {
  name: "modal-purches-bot",
  ownerOnly: false,
  run: async (client, interaction, language, reply, embeds) => {
    try {
      const balanceSchema = require("../../../Schema/Balance");
      let type = interaction.customId.split("_")[0]?.trim();

      const bot = bots.get(type);
      let botCommands = [];
      let configCommands = commands.get("config");
      botCommands.push(...configCommands);

      if (commands.has(type)) {
        let args = {
          commands: commands.get(type).forEach((comID) => {
            let com = commands.get(comID);
            botCommands.push(com);
          }),
        };
      }
      await interaction.deferReply({ ephemeral: true });

      let usercoins = 0;
      let userdata = await balanceSchema.findOne({
        userid: interaction.user.id,
        guild: interaction.guild.id,
      });
      usercoins = userdata?.balance || 0;
      let botPrice = 0;
      botPrice =
        Prices.get(
          `${bot.priceKey}_${interaction.guild.id}_${client.user.id}`,
        ) || 1;
      const prefix = interaction.fields.getTextInputValue("prefix");
      const owner = interaction.fields.getTextInputValue("owner");
      const language = interaction.fields.getTextInputValue("language");

      if (language !== "En" && language !== "Ar") {
        return interaction.editReply({
          content: `**Unsupported language**: You entered an unsupported language. Please select either English (En) or Arabic (Ar).`,
          ephemeral: true,
        });
      }

      if (isNaN(owner)) {
        return interaction.editReply({
          content: `**Invalid Owner ID**: You have entered an invalid bot owner ID. Example: **941085346886717480**`,
          ephemeral: true,
        });
      }

      if (prefix === "/") {
        return interaction.editReply({
          content: `**Invalid Prefix**: You cannot choose \`/\` as the bot prefix.`,
          ephemeral: true,
        });
      }

      const data = await BotMakerDB.get(
        `BotMakerData_${client.user.id}_${interaction.guild.id}`,
      );
      const logs = data.sellLogs;
      const logchannel = await client.channels.cache.get(logs);
      const logss = data.privateLogs;
      const adminchannel = await client.channels.cache.get(logss);
      userdata.balance = userdata.balance - +botPrice;
      userdata.coins = userdata.balance - +botPrice;
      userdata.save().then(async () => {
        await interaction.editReply({
          content: `Purchase Successful: Your bot has been purchased successfully and will be sent to you shortly. Please wait for a sec.`,
          ephemeral: true,
        });

        const BotID = IdsData.get(`${type}ID`) || 1;
        const BotInID = IdsData.get(`${type}_${client.user.id}-ID`) || 1;
        const purchasesID = IdsData.get(`PurchasesID`) || 1;
        const purchasesServerID =
          IdsData.get(`${client.user.id}_PurchasesID`) || 1;
        IdsData.set(`${type}ID`, BotID + 1)
          .then(() => {
            IdsData.set(`PurchasesID`, purchasesID + 1);
          })
          .then(() => {
            IdsData.set(`${client.user.id}_PurchasesID`, purchasesServerID + 1);
          })
          .then(() => {
            IdsData.set(`${type}_${client.user.id}-ID`, BotInID + 1);
          });
        const tokens = TokenDB.get(`TOKENS`) || [];
        const token = tokens[0];
        TokenDB.pull(`TOKENS`, token);
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

        client1
          .login(token)
          .then(async () => {
            const buyerembed = new EmbedBuilder()
              .setFooter({
                text: interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
              })
              .setDescription(
                `## Successfully Purchased ${type} Bot!\n**-# Owner: ${owner}\n-# Bot: ${client1.user.id}, ${client1.user.username}\n-# Prefix: ${prefix}\n-# Purchase ID: ${purchasesID}-${BotID}\n-# Price: ${botPrice}**`,
              )
              .setColor(interaction.guild.members.me?.displayColor)
              .setTimestamp(Date.now());

            const invite_Button = new ActionRowBuilder().addComponents([
              new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setURL(
                  `https://discord.com/api/oauth2/authorize?client_id=${client1.user.id}&permissions=8&scope=bot%20applications.commands`,
                )
                .setLabel(`invite`)
                .setDisabled(false),
            ]);

            if (data.role) {
              try {
                await interaction.member.roles.add(data.role);
              } catch (error) {}
            }

            if (logchannel) {
              try {
                const embed = new EmbedBuilder()
                  .setColor(interaction.guild.members.me.displayHexColor)
                  .setDescription(
                    `__**${type}**__ bot has been successfully purchased by **${interaction.user.username}**.`,
                  );
                logchannel.send({ embeds: [embed] });
              } catch (error) {}
            }

            const startTime = moment().format("YYYY-MM-DD HH:mm:ss");
            const endTime = moment()
              .add(30, "days")
              .format("YYYY-MM-DD HH:mm:ss");

            interaction.user
              .send({ embeds: [buyerembed], components: [invite_Button] })
              .catch((err) => {
                const invite_Button = new ActionRowBuilder().addComponents([
                  new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                      `https://discord.com/api/oauth2/authorize?client_id=${client1.user.id}&permissions=8&scope=bot%20applications.commands`,
                    )
                    .setLabel(`invite`)
                    .setDisabled(false),
                  new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                      `https://canary.discord.com/channels/${config.Server}/${config.Rate}`,
                    )
                    .setLabel(`Rate us`)
                    .setDisabled(false),
                  new ButtonBuilder()
                    .setCustomId(`resendbot_${interaction.user.id}`)
                    .setStyle(ButtonStyle.Success)
                    .setLabel(`Resend`)
                    .setDisabled(false),
                ]);
                if (adminchannel) {
                  let embed = new EmbedBuilder()
                    .setColor(interaction.guild.members.me?.displayColor)
                    .setTitle(`Error while sending bot invoice to the client`)
                    .setDescription(
                      `Client: ${interaction.user}\nError: DM closed`,
                    )
                    .setTimestamp();
                  adminchannel.send({
                    embeds: [embed, buyerembed],
                    components: [invite_Button],
                  });
                }
              });

            db2
              .push(`Bots`, {
                Token: token,
                Owner: owner,
                ClientID: client1.user.id,
                Seller: interaction.guild.id,
                BotID: BotID,
                Type: type,
                Price: botPrice,
                Subs: true,
                PurchasesID: purchasesID,
                endTime: endTime,
                startTime: startTime,
              })
              .then(() => {
                prefixDB.set(`Prefix_${client1.user.id}`, prefix).then(() => {
                  OwnerDB.set(`Owner_${client1.user.id}`, owner)
                    .then(() => {
                      const commandsData = new Database(
                        `./Database/CommandsData/BotsCommands_${client1.user.id}.json`,
                      );
                      commandsData.set(
                        `commands_${client1.user.id}`,
                        botCommands,
                      );
                    })
                    .then(() => {
                      runDB.set(client1.user.id, true);
                    });
                });
              });

            try {
              if (adminchannel) {
                const logembed = new EmbedBuilder()
                  .setColor(interaction.guild.members.me.displayHexColor)
                  .setTitle("Bot Purchase Details")
                  .setDescription(
                    `Bot Type: ${type}\nClient: ${interaction.user.username}\nBot ID: ${client1.user.id}\nStart Time: ${startTime}\nEnd Time: ${endTime}`,
                  );
                adminchannel.send({ embeds: [logembed] });
              }
            } catch (err) {
              console.log(err);
            }
          })
          .catch(async (error) => {
            console.log(`${error}\nToken: ${token}`);
            interaction.editReply({
              content: `There was an error completing your purchase. There was an error processing your coins`,
            });
          });
      });
    } catch (error) {
      console.log(error);
    }
  },
};
