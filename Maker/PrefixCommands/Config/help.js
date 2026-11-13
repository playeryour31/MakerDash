const { EmbedBuilder, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { Database } = require("st.db");
const fs = require("fs");
const path = require("path");

const AliasesDB = new Database('/Database/Others/Aliases.json');

module.exports = {
    name: "help",
    type: "Config",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: true,

    /**
     * @param {Message} message
     */
    run: async (client, message, args, language, reply, replyEmbeds, name, helpCommands) => {
        try {
            const commandsdb = new Database(`/Database/CommandsData/BotsCommands_${client.user.id}.json`);
            let botCommands = commandsdb.get('commands_' + client.user.id) || [];
            const types = [...new Set(botCommands.map(com => com.type || "Other"))];

            const embed = new EmbedBuilder()
                .setTitle("Bot Commands Help")
                .setColor(message.guild.members.me.displayColor || 0x2C2F33)
                .setDescription("**Select a category to view its commands.**")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

            const rows = [];
            for (let i = 0; i < types.length; i += 5) {
                const buttons = types.slice(i, i + 5).map(type =>
                    new ButtonBuilder()
                        .setCustomId(type)
                        .setLabel(type)
                        .setStyle(ButtonStyle.Secondary)
                );
                rows.push(new ActionRowBuilder().addComponents(buttons));
            }

            const msg = await message.reply({
                embeds: [embed],
                components: rows,
                allowedMentions: { repliedUser: false }
            });

            const collector = msg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 120000
            });

            collector.on("collect", async (interaction) => {
                const selectedType = interaction.customId;
                let filteredCommands = botCommands.filter(com => com.type === selectedType);

                filteredCommands.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

                const usageFile = path.join(__dirname, `/../../Resources/CommandUsage/CommandUsage.json`);
                let usageData = {};

                if (fs.existsSync(usageFile)) {
                    usageData = JSON.parse(fs.readFileSync(usageFile, "utf-8"));
                }

                let embeds = [];
                let fields = [];

                filteredCommands.forEach(com => {
                    const commandUsage = usageData[com.name] || {};
                    const description = reply.Help[com.name] || commandUsage.description || com.description || "No description provided.";

                    fields.push({
                        name: `**${com.name || "Unnamed Command"}**`,
                        value: `-# ${description}`,
                        inline: false
                    });

                    if (fields.length === 15) {
                        embeds.push(
                            new EmbedBuilder()
                                .setDescription(`## ${selectedType} Commands`)
                                .setColor(message.guild.members.me.displayColor)
                                .addFields(fields)
                        );
                        fields = [];
                    }
                });

                if (fields.length > 0) {
                    embeds.push(
                        new EmbedBuilder()
                            .setDescription(`## ${selectedType} Commands`)
                            .setColor(message.guild.members.me.displayColor)
                            .addFields(fields)
                    );
                }

                const updatedRows = [];
                for (let i = 0; i < types.length; i += 5) {
                    const updatedButtons = types.slice(i, i + 5).map(type =>
                        new ButtonBuilder()
                            .setCustomId(type)
                            .setLabel(type)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(type === selectedType) 
                    );
                    updatedRows.push(new ActionRowBuilder().addComponents(updatedButtons));
                }

                await interaction.update({
                    embeds: embeds,
                    components: updatedRows
                });
            });

            collector.on("end", () => {
                msg.edit({ components: [] });
            });

        } catch (error) {
            console.error("Error in help command:", error);
            return message.reply({
                embeds: [replyEmbeds.notFoundEmbed],
                allowedMentions: { repliedUser: false },
            });
        }
    },
};
