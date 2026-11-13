const {
    WebhookClient,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder
} = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { Database } = require("st.db");
const Tokens = new Database("./Database/Others/Tokens.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("manage")
        .setDescription("Manage your bots"),

    ownerOnly: false,

    async run(client, interaction) {
        try {
            const { Blacklist } = require("../../../Schema/Blacklist");
            const isBlacklisted = await Blacklist.findOne({ UserID: interaction.user.id });
            if (isBlacklisted) {
                return interaction.reply({
                    content: `You are blacklisted from using this command.`,
                    ephemeral: true,
                });
            }

            const userBots = (Tokens.get("Bots") || []).filter(
                bot => bot.Owner === interaction.user.id && bot.Seller === interaction.guild.id
            );

            if (userBots.length === 0) {
                return interaction.reply({
                    content: `You do not own any bots.`,
                    ephemeral: true
                });
            }

            const botChunks = [];
            for (let i = 0; i < userBots.length; i += 7) {
                botChunks.push(userBots.slice(i, i + 7));
            }

            const actionRows = await Promise.all(
                botChunks.map(async (chunk) => {
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId(`select-bots`)
                        .setPlaceholder("Select a bot to manage")
                        .addOptions(
                            await Promise.all(
                                chunk.map(async bot => {
                                    const Client = await client.users.fetch(bot.ClientID).catch(() => ({
                                        username: `${bot.Type} #${bot.BotID}`
                                    }));

                                    return {
                                        label: `${Client.username}`,
                                        description: `${bot.Type} Bot`,
                                        value: `${bot.ClientID}`,
                                    };
                                })
                            )
                        );

                    return new ActionRowBuilder().addComponents(menu);
                })
            );

            const embed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayColor)
                .setDescription(`## Manage Your Bots\n-# **Select a bot from the list below to manage it:**`)
                .setFooter({ text: `You have ${userBots.length} bots.` });

            await interaction.reply({
                embeds: [embed],
                components: actionRows
            });

        } catch (error) {
            console.error("Error in /manage command:", error);
            return interaction.reply({
                content: `An error occurred while executing the command. Please try again later.`,
                ephemeral: true
            });
        }
    },
};
