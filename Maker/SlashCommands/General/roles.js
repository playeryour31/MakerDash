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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Get a list of server roles.')

    ,
    type: "General",
    botP: [],
    userP: [],
    P: ""
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
          try {
            const roles = interaction.guild.roles.cache
                .sort((a, b) => b.position - a.position)
                .map(role => ({
                    name: role.name,
                    members: role.members.size
                }));

            const chunkSize = 20;
            let page = 0;

            const maxRoleLength = Math.max(...roles.map(r => r.name.length), 10);

            function generateEmbed(page) {
                const start = page * chunkSize;
                const end = start + chunkSize;
                
                const rolesList = roles.slice(start, end).map(r =>
                    `${r.name.padEnd(maxRoleLength)}  ${r.members} members`
                ).join("\n") || "لا يوجد.";

                return new EmbedBuilder()
                    .setDescription("```js\n" + rolesList + "\n```")
                    .setColor(interaction.guild.members.me.displayColor)
                    .setFooter({ text: `${page + 1}/${Math.ceil(roles.length / chunkSize)}` });
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("⬅").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId("next").setLabel("➡").setStyle(ButtonStyle.Secondary).setDisabled(roles.length <= chunkSize)
            );

            const message = await interaction.reply({ embeds: [generateEmbed(page)], components: [row], fetchReply: true });

            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on("collect", async i => {
                if (i.customId === "prev" && page > 0) page--;
                if (i.customId === "next" && page < Math.ceil(roles.length / chunkSize) - 1) page++;

                await i.update({
                    embeds: [generateEmbed(page)],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId("prev").setLabel("⬅").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                            new ButtonBuilder().setCustomId("next").setLabel("➡").setStyle(ButtonStyle.Secondary).setDisabled(page >= Math.ceil(roles.length / chunkSize) - 1)
                        )
                    ]
                });
            });

            collector.on("end", () => {
                message.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.log(error);
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    }
};