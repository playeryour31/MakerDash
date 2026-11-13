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
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("giveaway")
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('glist')
        .setDescription('View a custom list of giveaways based on their status.')
        .addStringOption(option => 
            option.setName("type")
                .setDescription("Select the type of giveaways to display.")
                .setRequired(true)
                .addChoices(
                    { name: "Running Giveaways", value: "running" },
                    { name: "Ended Giveaways", value: "ended" },
                    { name: "All Giveaways", value: "all" }
                )
        ),
    type: "Giveaway",
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
            const type = interaction.options.getString("type");
            let giveaways = [];

            if (type === "running") {
                giveaways = db.get(`RunningGiveaway_${client.user.id}`) || [];
            } else if (type === "ended") {
                giveaways = db.get(`EndsGiveaway_${client.user.id}`) || [];
            } else if (type === "all") {
                const running = db.get(`RunningGiveaway_${client.user.id}`) || [];
                const ended = db.get(`EndsGiveaway_${client.user.id}`) || [];
                giveaways = [...running, ...ended];
            }

            if (!giveaways.length) {
                return interaction.reply({ content: reply.Giveaway.Reply17, ephemeral: true });
            }

            giveaways.sort((a, b) => new Date(b.Time) - new Date(a.Time));

            let page = 0;
            const perPage = 3;
            const totalPages = Math.ceil(giveaways.length / perPage);

            function generateEmbed() {
                const start = page * perPage;
                const end = start + perPage;
                const currentGiveaways = giveaways.slice(start, end);

                const embed = new EmbedBuilder()
                    .setColor(interaction.guild.members.me.displayColor)
                    .setTitle(`Giveaway List - ${type.charAt(0).toUpperCase() + type.slice(1)}`)
                    .setFooter({ text: `${page + 1}/${totalPages} | ${giveaways.length} giveaways` });

                currentGiveaways.forEach((g, index) => {
                    const formattedTime = moment(g.Time).fromNow();
                    embed.addFields({
                        name: `#${start + index + 1} ${g.Prize}`,
                        value: `-# Channel: <#${g.channelID}>\n-# Winners: (**${g.WinnersCount || g.Winners}**) ${g.Winner}\n-# Time: ${formattedTime}\n-# Reroll: ${g.Reroll || null}`,
                        inline: false
                    });
                });

                return embed;
            }

            const row = () => new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("prev_page")
                        .setLabel("⬅️")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId("next_page")
                        .setLabel("➡️")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages - 1)
                );

            const message = await interaction.reply({
                embeds: [generateEmbed()],
                components: [row()],
                ephemeral: false
            });

            const filter = i => i.user.id === interaction.user.id;
            const collector = message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on("collect", async i => {
                if (i.customId === "prev_page" && page > 0) {
                    page--;
                } else if (i.customId === "next_page" && page < totalPages - 1) {
                    page++;
                }

                await i.update({
                    embeds: [generateEmbed()],
                    components: [row()]
                });
            });

        } catch (error) {
            console.log(error);
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true });
        }
    },
};
