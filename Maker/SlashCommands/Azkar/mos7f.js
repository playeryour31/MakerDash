const {
    Client,
    Collection,
    Discord,
    createInvite,
    WebhookClient,
    PermissionFlagsBits,
    GatewayIntentBits,
    Partials,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    Events,
    Message,
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
    PermissionOverwriteManager,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const { ChannelType } = require("discord-api-types/v9");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('mos7f')
        .setDescription('read the quran.'),
    type: "Muslim",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    support: false,
    ownerOnly: false,
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const pages = require("../../Utils/Azkar/Mos7f.js");
            let page = 1;

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('left')
                        .setLabel('←')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('right')
                        .setLabel('→')
                        .setStyle(ButtonStyle.Secondary)
                );

            let embed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayHexColor)
                .setFooter({
                    text: `القراآن الكريم | صفحة رقم ${page} من اصل ${pages.length} صفحة`
                })
                .setImage(pages[page - 1]);

            const msg = await interaction.reply({ 
                embeds: [embed], 
                components: [row], 
                fetchReply: true 
            });

            const filter = (i) => i.user.id === interaction.user.id;
            const collector = msg.createMessageComponentCollector({ filter, time: 50000000 });

            collector.on('collect', async (i) => {
                if (i.customId === 'left') {
                    if (page > 1) {
                        page--;
                        embed.setImage(pages[page - 1]);
                        embed.setFooter({
                            text: `القراآن الكريم | صفحة رقم ${page} من اصل ${pages.length} صفحة`,
                            iconURL: "https://images-ext-2.discordapp.net/external/Fp9gUUJ_-w-JKouEOUSeDrP0mPDn4PBlOunqJiqA7Ao/https/e7.pngegg.com/pngimages/698/430/png-clipart-the-holy-qur-an-text-translation-and-commentary-tafsir-noble-quran-quran-translations-al-quran-holy-qur-an-text.png?width=427&height=427"
                        });
                        await i.update({ embeds: [embed] });
                    }
                } else if (i.customId === 'right') {
                    if (page < pages.length) {
                        page++;
                        embed.setImage(pages[page - 1]);
                        embed.setFooter({
                            text: `القراآن الكريم | صفحة رقم ${page} من اصل ${pages.length} صفحة`,
                            iconURL: "https://images-ext-2.discordapp.net/external/Fp9gUUJ_-w-JKouEOUSeDrP0mPDn4PBlOunqJiqA7Ao/https/e7.pngegg.com/pngimages/698/430/png-clipart-the-holy-qur-an-text-translation-and-commentary-tafsir-noble-quran-quran-translations-al-quran-holy-qur-an-text.png?width=427&height=427"
                        });
                        await i.update({ embeds: [embed] });
                    }
                }

                i.deferUpdate();
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    row.components.forEach((button) => button.setDisabled(true));
                    msg.edit({ components: [row] });
                }
            });

        } catch (error) {
            console.log(error);
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    },
};
