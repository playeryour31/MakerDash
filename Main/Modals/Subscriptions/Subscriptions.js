const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
} = require("discord.js");

const moment = require('moment-timezone');
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const Prices = new Database("/Database/BotMaker/Prices.json");
const IdsData = new Database("/Database/BotMaker/IDs.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const TokenDB = new Database("/Database/Others/UnusedTokens.json");
const db2 = new Database("/Database/Others/BotMakerTokens.json");
const ErrTokens = new Database("/Database/Tokens/ErrTokens.json");
const Lan = new Database("/Database/Others/Language.json");
const runDB = new Database("/Database/BotMaker/RunBots.json");
const prefixDB = new Database("/Database/Others/PrefixData");
const OwnerDB = new Database("/Database/Others/OwnerData");
const config = require('../../Resources/Config.json');
const commands = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Commands.json'));
const bots = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Bots.json'));
const Colors = require('../../Resources/Colors.json');
const { ensureBalance } = require('../../../src/shared/services/balanceService');

module.exports = {
    name: "modal-purches-subscriptions",
    ownerOnly: false,
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        try {
            if (!interaction.deferred && !interaction.replied) {
                try {
                    await interaction.deferReply({ ephemeral: true });
                } catch (ackErr) {
                    if (ackErr?.code === 10062) {
                        console.warn('[modal-purches-subscriptions] interaction expired (10062)');
                        return;
                    }
                    throw ackErr;
                }
            }

            const balanceSchema = require('../../../Schema/Balance');
            let userdata = await ensureBalance(interaction.user.id, interaction.guild.id);
            let usercoins = Number(userdata?.balance) || 0;
            let botPrice = Prices.get(`Maker_${interaction.guild.id}`) || 1;
            const server = interaction.fields.getTextInputValue("server");
            const ownersInput = interaction.fields.getTextInputValue("owner");
            const owners = ownersInput.split(/[\s,]+/).filter(id => id.trim() !== "");
            const invalidOwners = owners.filter(id => isNaN(id));

            if (invalidOwners.length > 0) {
                const embed = new EmbedBuilder()
                    .setColor(Colors.RedWarn)
                    .setTitle('Invalid Owner ID')
                    .setDescription(`<:warn:1312108592043786340> You have entered an invalid bot owner ID\nExample: **941085346886717480**\n\nInvalid IDs: \`${invalidOwners.join(", ")}\``)
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed], ephemeral: true });
            }

            if (usercoins < botPrice) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Warn)
                            .setTitle('Insufficient balance')
                            .setDescription(`You need **${botPrice}** coins, but you have **${usercoins}**.`)
                    ],
                    ephemeral: true
                });
            }

            // UnusedTokens.json stores the pool under "Tokens" (not "TOKENS")
            const tokens = TokenDB.get('Tokens') || TokenDB.get('TOKENS') || [];
            const token = tokens[0];
            if (!token) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Yellow)
                            .setTitle('Out of stock')
                            .setDescription('No unused tokens available. Please contact the admins and try again later.')
                    ],
                    ephemeral: true
                });
            }

            const data = await BotMakerDB.get(`BotMakerData_${interaction.guild.id}`);
            const logs = data?.sellslog;
            const logchannel = logs ? await client.channels.cache.get(logs) : null;
            const AdminChannel = await client.channels.cache.get(config.LogChannels.AdminsLog);

            userdata.balance = usercoins - botPrice;
            userdata.coins = userdata.balance;
            await balanceSchema.updateOne(
                { userid: interaction.user.id, guild: interaction.guild.id },
                { balance: userdata.balance, coins: userdata.coins },
                { upsert: true }
            );
            const roleID = '1199047360215523518';

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.LighGreen)
                        .setTitle(`Purchase Successful`)
                        .setDescription(`<:signcheck:1293713968266874952> Your bot has been purchased successfully and will be sent to you shortly. Please wait for a sec.`)
                ],
                ephemeral: true
            });

            try {
                if (TokenDB.has('Tokens')) TokenDB.pull('Tokens', token);
                else if (TokenDB.has('TOKENS')) TokenDB.pull('TOKENS', token);
            } catch (pullErr) {
                console.error('Failed to pull unused token:', pullErr.message);
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
                        .setDescription(`Only **${tokens.length - 1}** unused tokens remaining.`)
                        .setFooter({ text: `Please renew the tokens as soon as possible.` })
                        .setTimestamp();
                    AdminChannel.send({ embeds: [embed] });
                }
            }

            const BotID = IdsData.get(`MakersID`) || 1;
            const purchasesID = IdsData.get(`PurchasesID`) || 1;

            // mainDb Database.set is sync (no Promise)
            IdsData.set(`MakersID`, BotID + 1);
            IdsData.set(`PurchasesID`, purchasesID + 1);
            const usersToGiveRole = [...owners, interaction.user.id];

            try {
                await client1.login(token);

                const buyerembed = new EmbedBuilder()
                    .setTitle(`Your **Maker Bot** Purchase Was Successful!`)
                    .setDescription(`Your bot is now ready to use! It will be available for **30 days** starting from now.`)
                    .addFields(
                        { name: '<:user:1314653195846287381> Owner', value: `\`${owners.join(", ")}\``, inline: false },
                        { name: '<:ID:1312130820537978943> BotID', value: `\`${client1.user.id}\``, inline: false },
                        { name: '<:ID:1312130820537978943> Subscription ID', value: `\`${BotID}\``, inline: false },
                        { name: '<:wallet:1317462594814214264> Price', value: `\`$${botPrice}\``, inline: false }
                    )
                    .setFooter({ text: `Thank you for your purchase!` })
                    .setColor(Colors.Main);

                if (logs && logchannel) {
                    try {
                        const embed = new EmbedBuilder()
                            .setColor(Colors.Main)
                            .setDescription(`<:Maker:1225464334277148702> __**Maker**__ bot has been successfully purchased by **${interaction.user.username}**.`);
                        logchannel.send({ embeds: [embed] });
                    } catch (error) {}
                }

                for (const userID of usersToGiveRole) {
                    try {
                        const member = await interaction.guild.members.fetch(userID);
                        if (member) {
                            await member.roles.add(roleID);
                        }
                    } catch (error) {}
                }

                const startTime = moment().format('YYYY-MM-DD HH:mm:ss');
                const endTime = moment().add(30, 'days').format('YYYY-MM-DD HH:mm:ss');
                const inviteButton = new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client1.user.id}&permissions=8&scope=bot%20applications.commands`)
                        .setLabel(`Invite`)
                        .setDisabled(false),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://canary.discord.com/channels/1131928626003202171/1189637363073286164`)
                        .setLabel(`Rate us`)
                        .setDisabled(false),
                ]);

                interaction.user.send({ embeds: [buyerembed], components: [inviteButton] }).catch(err => {
                    const inviteButtonResend = new ActionRowBuilder().addComponents([
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client1.user.id}&permissions=8&scope=bot%20applications.commands`)
                            .setLabel(`Invite`)
                            .setDisabled(false),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://canary.discord.com/channels/1131928626003202171/1189637363073286164`)
                            .setLabel(`Rate us`)
                            .setDisabled(false),
                        new ButtonBuilder()
                            .setCustomId(`resendbot_${interaction.user.id}`)
                            .setStyle(ButtonStyle.Success)
                            .setLabel(`Resend`)
                            .setDisabled(false),
                    ]);

                    if (AdminChannel) {
                        let embed = new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setTitle(`Error Sending Bot Details to Client`)
                            .setDescription(`The client: ${interaction.user}\nReason: DM is closed`)
                            .addFields(
                                { name: '<:user:1314653195846287381> Owner', value: `\`${owners.join(", ")}\``, inline: false },
                                { name: '<:ID:1312130820537978943> BotID', value: `\`${client1.user.id}\``, inline: false },
                                { name: '<:ID:1312130820537978943> Subscription ID', value: `\`${BotID}\``, inline: false },
                                { name: '<:wallet:1317462594814214264> Price', value: `\`$${botPrice}\``, inline: false }
                            )
                            .setTimestamp();
                        AdminChannel.send({ embeds: [embed, buyerembed], components: [inviteButtonResend] });
                    }
                });

                db2.push(`Subscriptions`, {
                    Token: token,
                    Owner: usersToGiveRole,
                    ClientID: client1.user.id,
                    Seller: interaction.guild.id,
                    MainGuild: server,
                    BotID: BotID,
                    Type: "Maker",
                    Price: botPrice,
                    PurchasesID: purchasesID,
                    endTime: endTime,
                    startTime: startTime
                });
                runDB.set(client1.user.id, true);
            } catch (error) {
                console.log(`${error}\nToken: ${token}`);
                await interaction.editReply({
                    content: `An error occurred during the purchase process.\nError in returning coins to your account.`,
                }).catch(() => {});
                if (token) {
                    try { ErrTokens.push('Tokens', token); } catch (_) {}
                }
            }
        } catch (error) {
            console.log(error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: 'حدث خطأ أثناء إتمام الشراء. حاول مرة أخرى.',
                }).catch(() => {});
            }
        }
    }
};
