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
        .setName("inrole")
        .setDescription("Shows the list of users in a specific role.")
        .addRoleOption(option =>
            option.setName("role")
                .setDescription("The role to find users in")
                .setRequired(true)
        ),
    type: "Others",
    botP: [PermissionFlagsBits.ManageGuild],
    userP: [PermissionFlagsBits.ManageGuild],
    P: "ManageGuild",
    support: false,
    ownerOnly: false,

    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            await interaction.deferReply({ ephemeral: false });
            const role = interaction.options.getRole("role");
            if (!role) return interaction.editReply({ embeds: [replyEmbeds.errorEmbed] });
            const membersWithRole = interaction.guild.members.cache
                .filter(member => member.roles.cache.has(role.id))
                .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
            if (membersWithRole.size === 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setDescription(`## ${role.name}.`).setColor(interaction.guild.members.me.displayColor)]
                });
            }
            const membersArray = membersWithRole.map((member, index) => `${member.user.tag} | ${member.user.id}`);
            const itemsPerPage = 30;
            let currentPage = 0;
            const getEmbed = () => {
const pageMembers = membersArray
    .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
    .map((member, index) => `-# - ${member}`);
                return new EmbedBuilder()
                    .setDescription(`## ${role.name}\n` + pageMembers.join("\n"))
                    .setColor(interaction.guild.members.me.displayColor)
                    .setFooter({
                        text: `${currentPage + 1}/${Math.ceil(membersArray.length / itemsPerPage)} | Length: ${membersArray.length}`,
                        iconURL: interaction.user.displayAvatarURL()
                    });
            };
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("back").setEmoji("⬅️").setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
                new ButtonBuilder().setCustomId("next").setEmoji("➡️").setStyle(ButtonStyle.Secondary).setDisabled((currentPage + 1) * itemsPerPage >= membersArray.length)
            );
            await interaction.editReply({ embeds: [getEmbed()], components: [row] });
            const filter = i => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
            collector.on("collect", async (i) => {
                if (i.customId === "next") currentPage++;
                else if (i.customId === "back") currentPage--;
                const updatedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("back").setEmoji("⬅️").setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
                    new ButtonBuilder().setCustomId("next").setEmoji("➡️").setStyle(ButtonStyle.Secondary).setDisabled((currentPage + 1) * itemsPerPage >= membersArray.length)
                );
                await i.update({ embeds: [getEmbed()], components: [updatedRow] });
            });
            collector.on("end", () => {
                interaction.editReply({ components: [] });
            });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [replyEmbeds.errorEmbed] });
        }
    }
};
