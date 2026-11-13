const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder } = require("discord.js");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const botPrices = new Database("/Database/BotMaker/Prices.json");
const Tokens = new Database("/Database/Others/Tokens.json");
const UnusedTokens = new Database("/Database/Others/UnusedTokens.json");
const WorkingTokens = new Database("/Database/Tokens/WorkingTokens.json");
const NonWorkingTokens = new Database("/Database/Tokens/NonWorkingTokens.json");
const axios = require('axios');
const bots = require("../../Resources/Bots.json");
const Colors = require("../../Resources/Colors.json");
const { checkToken } = require("../../Functions/TokensChecker");

module.exports = {
    name: "admin-select",
    description: "",
    usage: [""],
    botPermission: [""],
    authorPermission: [""],
    cooldowns: [0],
    ownerOnly: true,

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction) => {
        const use = interaction.values[0];
        
        if (use === "prices-list") {
            try {
                const botOptions = Object.values(bots).filter(bot => bot.type);

                if (!botOptions.length) {
                    return interaction.reply({
                        content: "No bots are available at the moment.",
                        ephemeral: true,
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle("Bot Prices List")
                    .setDescription("Here are the available bots and their prices:")
                    .setColor(Colors.Main);

                for (const bot of botOptions) {
                    if (!bot.name || !bot.priceKey || !bot.type) {
                        console.error(`Invalid bot data: ${JSON.stringify(bot)}`);
                        continue;
                    }

                    const botPriceKey = `${bot.priceKey}_${interaction.guild.id}`;
                    const botPrice = await botPrices.get(botPriceKey) || "Not set";

                    embed.addFields({
                        name: bot.name,
                        value: `Price: ${botPrice}`,
                        inline: true,
                    });
                }

                await interaction.update({ embeds: [embed], ephemeral: true });

            } catch (error) {
                console.error("Error in prices-list:", error);
                return interaction.reply({
                    content: `An error occurred while fetching prices: ${error.message}`,
                    ephemeral: true,
                });
            }
        }

        else if (use === "top-coins") {
            try {
                const Balance = require("../../../Schema/Balance.js");
                const allUsers = await Balance.find({ guild: interaction.guild.id })
                    .sort({ balance: -1 });

                if (!allUsers.length) {
                    return interaction.reply({
                        content: "No users found with coins.",
                        ephemeral: true,
                    });
                }

                const usersPerPage = 50; 
                let currentPage = 0;

                const generateEmbed = (page) => {
                    const start = page * usersPerPage;
                    const end = start + usersPerPage;
                    const leaderboard = allUsers.slice(start, end)
                        .map((user, index) => `${start + index + 1}. <@${user.userid}> (${user.userid}) **\`${user.balance}¢\`** coins`)
                        .join("\n");

                    return new EmbedBuilder()
                        .setTitle("Top Coins Leaderboard")
                        .setDescription(leaderboard || "No users on this page.")
                        .setColor(Colors.Main)
                        .setFooter({ text: `Page ${page + 1} of ${Math.ceil(allUsers.length / usersPerPage)}` });
                };

                const generateButtons = (page) => new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("prev_page")
                        .setLabel("Previous")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId("next_page")
                        .setLabel("Next")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled((page + 1) * usersPerPage >= allUsers.length)
                );

                const embed = generateEmbed(currentPage);
                const buttons = generateButtons(currentPage);

                const message = await interaction.update({
                    embeds: [embed],
                    components: [buttons],
                    ephemeral: false,
                });

                const collector = message.createMessageComponentCollector({
                    filter: (btnInteraction) => btnInteraction.user.id === interaction.user.id,
                    time: 120000, 
                });

                collector.on("collect", (btnInteraction) => {
                    if (btnInteraction.customId === "prev_page") {
                        currentPage--; 
                    } else if (btnInteraction.customId === "next_page") {
                        currentPage++;
                    }

                    const newEmbed = generateEmbed(currentPage);
                    const newButtons = generateButtons(currentPage);

                    btnInteraction.update({
                        embeds: [newEmbed],
                        components: [newButtons],
                    });
                });

                collector.on("end", () => {
                    message.edit({
                        components: [
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId("prev_page")
                                    .setLabel("Previous")
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true),
                                new ButtonBuilder()
                                    .setCustomId("next_page")
                                    .setLabel("Next")
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true)
                            ),
                        ],
                    });
                });
            } catch (error) {
                console.error("Error in top-coins:", error);
                return interaction.reply({
                    content: `An error occurred: ${error.message}`,
                    ephemeral: true,
                });
            }
        }        

        else if (use === "top-bots") {
            const botOptions = Object.values(bots).filter(bot => bot.type);
            if (!botOptions.length) {
                return interaction.reply({
                    content: "No bots are available at the moment.",
                    ephemeral: true,
                });
            }

            const BotsFind = Tokens.get('Bots') || [];
            const botTypeCounts = {};

            BotsFind.forEach(bot => {
                if (bot.Type) {
                    botTypeCounts[bot.Type] = (botTypeCounts[bot.Type] || 0) + 1;
                }
            });

            const embed = new EmbedBuilder()
                .setTitle("Top Bots")
                .setDescription("Here are the bot types and how many times they have been purchased:")
                .setColor(Colors.Main);

            for (const bot of botOptions) {
                if (!bot.name || !bot.type) {
                    console.error(`Invalid bot data: ${JSON.stringify(bot)}`);
                    continue;
                }
                const purchaseCount = botTypeCounts[bot.type] || 0;

                embed.addFields({
                    name: bot.name,
                    value: "`" + purchaseCount + "`",
                    inline: true,
                });
            }

            await interaction.update({ embeds: [embed], ephemeral: true });
        }

        else if (use === "tokens") {
            try {
                const unusedTokens = UnusedTokens.get('Tokens') || UnusedTokens.get('TOKENS') || [];
                if (!unusedTokens.length) {
                    return interaction.reply({
                        content: "No unused tokens available.",
                        ephemeral: true,
                    });
                }

                const wait = await interaction.reply({
                    content: "Please wait.",
                    ephemeral: true,
                });

                let workingCount = 0;
                let notWorkingCount = 0;
                let notWorkingTokens = [];

                async function checkToken(token) {
                    try {
                        const response = await axios.get('https://discord.com/api/v10/users/@me', {
                            headers: {
                                Authorization: `Bot ${token}`,
                            },
                        });

                        const { id, username, discriminator } = response.data;
                        const creationTimestamp = BigInt(id) >> 22n;
                        const creationDate = new Date(Number(creationTimestamp) + 1420070400000);

                        const workingTokens = WorkingTokens.get('tokens') || [];
                        workingTokens.push({
                            token,
                            info: {
                                id,
                                username,
                                discriminator,
                                creationDate: creationDate.toISOString(),
                            }
                        });
                        WorkingTokens.set('tokens', workingTokens);

                        return {
                            token,
                            status: 'working',
                            info: {
                                id,
                                username,
                                discriminator,
                                creationDate: creationDate.toISOString(),
                            },
                        };
                    } catch (error) {
                        const reason = error.response?.status === 401
                            ? 'Invalid Token'
                            : `Error: ${error.response?.status || error.message}`;

                        const nonWorkingTokens = NonWorkingTokens.get('tokens') || [];
                        nonWorkingTokens.push({ token, reason });
                        NonWorkingTokens.set('tokens', nonWorkingTokens);

                        return {
                            token,
                            status: 'not working',
                            reason,
                        };
                    }
                }

                for (const token of unusedTokens) {
                    const result = await checkToken(token);

                    if (result.status === 'working') {
                        workingCount++;
                    } else {
                        notWorkingCount++;
                        notWorkingTokens.push(token);
                    }
                }

                const BotsFind = Tokens.get('Bots') || [];
                const totalBotsCount = BotsFind.length + workingCount;

                const embed = new EmbedBuilder()
                    .setTitle("Token Report")
                    .addFields(
                        { name: "Working Tokens", value: `\`${workingCount}\``, inline: false },
                        { name: "Non-working Tokens", value: `\`${notWorkingCount}\``, inline: false },
                        { name: "Working Bots", value: `\`${BotsFind.length}\``, inline: false },
                        { name: "Total Tokens (Working + Bots)", value: `\`${totalBotsCount}\``, inline: false },
                    )
                    .setColor(Colors.Main);

                const config = require('../../Resources/Config.json');
                const AdminChannel = await client.channels.cache.get(config.LogChannels.AdminsLog);
                await AdminChannel.send({ embeds: [embed] });

                if (wait) return wait.delete();
                await interaction.reply({
                    content: "Token check complete. Results have been sent to the log channel.",
                    ephemeral: true,
                });

            } catch (error) {
                console.error("Error in tokens:", error);
                return interaction.reply({
                    content: `An error occurred while checking tokens: ${error.message}`,
                    ephemeral: true,
                });
            }
        } else if (use === "find-bot") {
            try {
                const modal = new ModalBuilder()
                    .setCustomId('find-bot-modal')
                    .setTitle('Enter Bot ID');
                const botIdInput = new TextInputBuilder()
                    .setCustomId('bot-input-id')
                    .setLabel('Enter the Bot ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., 123456789012345678')
                    .setRequired(true);
                const actionRow = new ActionRowBuilder().addComponents(botIdInput);
                modal.addComponents(actionRow);
                await interaction.showModal(modal);
            } catch (error) {
                console.error("Error in find:", error);
                return interaction.reply({
                    content: `An error occurred: ${error.message}`,
                    ephemeral: true,
                });
            }
        } else if (use === "find-user") {
    try {
        const memberMenu = new UserSelectMenuBuilder()
            .setCustomId(`user-info`)
            .setPlaceholder(`Select a user`)
            .setMinValues(1)
            .setMaxValues(1);

        const actionRow = new ActionRowBuilder().addComponents(memberMenu);

        return interaction.reply({
            content: `Please select a user.`,
            components: [actionRow],
            ephemeral: true,
        });

    } catch (error) {
        console.error("Error in find-user:", error);
        return interaction.reply({
            content: `An error occurred while selecting the user: ${error.message}`,
            ephemeral: true,
        });
    }
}
    },
};
