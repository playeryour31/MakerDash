const {
    Client,
    Collection,
    Discord,
    createInvite,
    ChannelType,
    WebhookClient,
    PermissionFlagsBits,
    GatewayIntentBits,
    Partials,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    Events,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
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
    RoleSelectMenuBuilder,
} = require("discord.js");
const { Database } = require('st.db');
const db = require("../../lib/featureDb")("giveaway")

module.exports = {
    name: "entries",
    ownerOnly: false,
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const messageID = interaction.message.id
            const data = db.get(`${interaction.guild.id}_${messageID}_Members`);

            if (!data) return interaction.deferUpdate();

            const itemsPerPage = 9;
            const totalPages = Math.ceil(data.length / itemsPerPage);
            let page = 1;

            const startIdx = (page - 1) * itemsPerPage;
            const endIdx = startIdx + itemsPerPage;

            const Embed = new EmbedBuilder()
                .setColor(interaction.member.displayHexColor)
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                .setThumbnail(client.user.avatarURL({ dynamic: true }))
                .setFooter({ text: `🎉 Page ${page}/${totalPages}` });

            let entrantsText = "";
            for (let i = startIdx; i < endIdx && i < data.length; i++) {
                const userId = data[i];
                const member = await interaction.guild.members.fetch(userId);
                entrantsText += `**${i + 1}.** <@!${userId}>\n`;
            }

            Embed.setDescription(entrantsText);

            const prevButton = new ButtonBuilder()
                .setCustomId(`prev`)
                .setStyle(ButtonStyle.Secondary)
                .setLabel("⬅");

            const nextButton = new ButtonBuilder()
                .setCustomId(`next`)
                .setStyle(ButtonStyle.Secondary)
                .setLabel("➡");

            const row = new ActionRowBuilder()
                .addComponents(prevButton, nextButton);

            const message = await interaction.reply({ embeds: [Embed], components: [row], ephemeral: true });

            const filter = (buttonInteraction) => {
                return buttonInteraction.user.id === interaction.user.id;
            };

            const collector = message.createMessageComponentCollector({ filter, time: 300000 });

            collector.on("collect", async (buttonInteraction) => {
                if (buttonInteraction.customId === "prev") {
                    page--;
                } else if (buttonInteraction.customId === "next") {
                    page++;
                }

                if (page < 1) {
                    page = 1;
                } else if (page > totalPages) {
                    page = totalPages;
                }

                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;

                entrantsText = "";
                for (let i = start; i < end && i < data.length; i++) {
                    const userId = data[i];
                    entrantsText += `**${i + 1}.** <@!${userId}>\n`;
                }

                Embed.setDescription(entrantsText);
                if (Embed.fields) {
                    Embed.spliceFields(0, Embed.fields.length);
                }

                Embed
                    .setDescription(entrantsText)
                    .setColor(interaction.member.displayHexColor)
                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .setThumbnail(client.user.avatarURL({ dynamic: true }))
                    .setFooter({ text: `🎉 Page ${page}/${totalPages}` });

                prevButton.setDisabled(page === 1);
                nextButton.setDisabled(page === totalPages);

                await buttonInteraction.update({ embeds: [Embed], components: [row] });
            });
        } catch (error) {

        }
    }
};