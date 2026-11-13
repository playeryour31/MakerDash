const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const Tokens = new Database("/Database/Others/Tokens.json");

module.exports = {
    name: "user-info",
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
        const userId = interaction.values[0];

        try {
            const bots = Tokens.get('Bots') || [];
            const userBots = bots.filter(bot => bot.Owner === userId);
            
            if (userBots.length === 0) {
                return interaction.reply({
                    content: "This user does not own any bots.",
                    ephemeral: true
                });
            }

            const botChunks = [];
            const chunkSize = 25;
            for (let i = 0; i < userBots.length; i += chunkSize) {
                botChunks.push(userBots.slice(i, i + chunkSize));
            }

            const actionRows = await Promise.all(
                botChunks.map(async (chunk, index) => {
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId(`select-bots-user_${index}`)
                        .setPlaceholder('Make a selection!')
                        .addOptions(
                            await Promise.all(
                                chunk.map(async bot => {
                                    const Client = await client.users.fetch(bot.ClientID).catch(() => ({ username: `${bot.Type} #${bot.BotID}` }));
                                    
                                    return {
                                        label: `${Client.username}`,
                                        value: `${bot.ClientID}`,
                                    };
                                })
                            )
                        );

                    return new ActionRowBuilder().addComponents(menu);
                })
            );

            return interaction.update({
                content: "Please select a bot from the list below:",
                components: actionRows,
                ephemeral: true
            });

        } catch (error) {
            console.error("Error fetching user bots:", error);
            return interaction.reply({
                content: "An error occurred while fetching the user's bots.",
                ephemeral: true
            });
        }
    },
};
