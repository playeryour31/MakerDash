const {
    EmbedBuilder
} = require("discord.js");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const Prices = new Database("/Database/BotMaker/Prices.json");
const Tokens = new Database("/Database/Others/Tokens.json");
const ExpiredDb = new Database("/Database/Others/Expired.json");
const rundb = new Database("./Database/BotMaker/RunBots.json");
const config = require("../../Resources/Config.json");
const Colors = require("../../Resources/Colors.json");
const { syncBotsToApiBackground } = require('../../../src/shared/services/tokensWriteBridge');
const lifecycle = require('../../../src/shared/services/subscriptionLifecycle');

module.exports = {
    name: "renew",
    ownerOnly: false,
    run: async (client, interaction, args) => {
        try {
            const balanceSchema = require('../../../Schema/Balance');
            const user = interaction.user;
            const userID = interaction.user.id;
            let clientID = interaction.customId.split("_")[1].trim();

            const found = await lifecycle.findBotForRenew(clientID, Tokens, ExpiredDb);
            let bot = found.bot;
            if (!bot) {
                return interaction.reply({ content: 'You do not own a bot with this ID.', ephemeral: true });
            }
            const ownerId = Array.isArray(bot.Owner) ? bot.Owner[0] : bot.Owner;
            if (String(ownerId) !== String(user.id)) {
                return interaction.reply({ content: 'You do not own a bot with this ID.', ephemeral: true });
            }

            const TheBot = await client.users.fetch(bot.ClientID).catch(() => bot.ClientID);
            const RenewTime = 30;

            const Type = bot.Type;
            const RenewPrice = await Prices.get(`${Type}P_${interaction.guild.id}`) || 100;
            const userdata = await balanceSchema.findOne({ userid: userID, guild: interaction.guild.id });
            const usercoins = userdata?.balance || 0;

            const currentEndTime = new Date(String(bot.endTime).replace(' ', 'T'));
            const currentTime = new Date();
            const timeDiff = currentEndTime - currentTime;
            const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

            const adminChannel = await client.channels.fetch(config.LogChannels.ConfigChannel).catch(() => null);
            const Colros = Colors;

            // Allow renew during grace (daysLeft negative) or when < 10 days left
            if (daysLeft >= 10) {
                await interaction.reply({
                    content: `You cannot renew the bot now. The remaining time is ${daysLeft} days. Renewal is allowed only when there are less than 10 days left.`,
                    ephemeral: true
                });

                if (adminChannel) {
                    await adminChannel.send({
                        embeds: [new EmbedBuilder()
                            .setTitle(`${TheBot.username || clientID} Renewal Failed`)
                            .setColor(Colros.YellowWarn || Colros.Yellow || '#FACC15')
                            .setDescription(`User ${interaction.user.tag} attempted to renew the bot with ${daysLeft} days remaining.`)
                            .addFields(
                                { name: 'Remaining Time', value: `${daysLeft} days`, inline: true },
                                { name: 'User Balance', value: `${usercoins} Coins`, inline: true },
                                { name: 'Bot Selected', value: `${TheBot.username || clientID}`, inline: true }
                            )
                            .setTimestamp()
                        ]
                    });
                }
                return;
            }

            if (usercoins < RenewPrice) {
                await interaction.reply({
                    content: `You do not have enough balance to renew the bot. You need ${RenewPrice} Coins, but you have ${usercoins}.`,
                    ephemeral: true
                });

                if (adminChannel) {
                    await adminChannel.send({
                        embeds: [new EmbedBuilder()
                            .setTitle(`${TheBot.username || clientID} Renewal Failed`)
                            .setColor(Colros.YellowWarn || Colros.Yellow || '#FACC15')
                            .setDescription(`User ${interaction.user.tag} does not have enough balance to renew the bot.`)
                            .addFields(
                                { name: 'Required Balance', value: `${RenewPrice} Coins`, inline: true },
                                { name: 'User Balance', value: `${usercoins} Coins`, inline: true },
                                { name: 'Bot Selected', value: `${TheBot.username || clientID}`, inline: true }
                            )
                            .setTimestamp()
                        ]
                    });
                }
                return;
            }

            userdata.balance -= RenewPrice;
            userdata.coins = userdata.balance;
            await userdata.save();

            // If already expired/grace, renew from now; else extend current end
            const base =
              Number.isNaN(currentEndTime.getTime()) || currentEndTime < currentTime
                ? new Date(currentTime)
                : new Date(currentEndTime);
            base.setDate(base.getDate() + RenewTime);
            const newEnd = lifecycle.formatBotDate(base);

            if (found.source === 'grace') {
                await lifecycle.restoreFromGrace(
                    clientID,
                    {
                        endTime: newEnd,
                        warnedBefore: false,
                        Token: bot.Token,
                    },
                    {
                      db2: Tokens,
                      db222: ExpiredDb,
                      rundb,
                      tokenPoolDb: new Database('/Database/Others/UnusedTokens.json'),
                    },
                );
            } else {
                const bots = Tokens.get('Bots') || [];
                const idx = bots.findIndex((b) => String(b.ClientID) === String(clientID));
                if (idx >= 0) {
                    bots[idx].endTime = newEnd;
                    bots[idx].warnedBefore = false;
                    await Tokens.set('Bots', bots);
                    syncBotsToApiBackground(bots);
                }
                await rundb.set(clientID, true);
                try {
                    const { runtimes } = require('../../../src/shared/services/mainDb');
                    await runtimes.setRunning(clientID, true);
                } catch {
                    /* optional */
                }
            }

            const endTime = new Date(String(newEnd).replace(' ', 'T'));
            const updatedDaysLeft = Math.floor((endTime - currentTime) / (1000 * 60 * 60 * 24));

            const renewalSuccessEmbed = new EmbedBuilder()
                .setTitle(`${TheBot.username || clientID} Renewed Successfully!`)
                .setColor(Colros.LighGreen || Colros.Main || '#22C55E')
                .setDescription(`The bot has been renewed successfully.`)
                .addFields(
                    { name: 'Bot Type', value: String(bot.Type), inline: true },
                    { name: 'Remaining Time', value: `${updatedDaysLeft} days`, inline: true },
                    { name: 'Total Deducted', value: `${RenewPrice} Coins`, inline: true },
                    { name: 'New End Time', value: `${endTime.toLocaleString()}`, inline: true }
                )
                .setTimestamp();

            if (adminChannel) {
                await adminChannel.send({ embeds: [renewalSuccessEmbed] });
            }

            await interaction.reply({
                content: `The bot has been successfully renewed.`,
                ephemeral: true
            });

        } catch (error) {
            console.log(error);
            await interaction.reply({ content: 'An error occurred while attempting to renew. Please try again later.', ephemeral: true });
        }
    }
};
