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
    name: "inrole",
    type: "Others",
    botP: [PermissionFlagsBits.ManageGuild],
    userP: [PermissionFlagsBits.ManageGuild],
    P: "ManageGuild",
    ownerOnly: false,
    /**
    * @param {Message} message
    */
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
            if (!role) {
                return message.reply({ embeds: [replyEmbeds.errorEmbed], allowedMentions: { repliedUser: false } });
            }

            const membersWithRole = message.guild.members.cache.filter(member => member.roles.cache.has(role.id));
            if (membersWithRole.size === 0) {
                return message.reply({
                    embeds: [new EmbedBuilder().setDescription(`## ${role.name}.`).setColor(0xFF0000)]
                });
            }

            const membersArray = membersWithRole.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp).map(m => m.user.tag);
            const itemsPerPage = 30;
            let currentPage = 0;

            const getEmbed = () => {
                const pageMembers = membersArray
                    .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
                    .map((member, index) => `${(currentPage * itemsPerPage) + index + 1}. ${member}`);

                return new EmbedBuilder()
                    .setDescription(`## ${role.name}\n` + pageMembers.join("\n"))
                    .setColor(message.guild.members.me.displayColor)
                    .setFooter({ text: `${currentPage + 1}/${Math.ceil(membersArray.length / itemsPerPage)} | Total: ${membersArray.length}`, iconURL: message.author.displayAvatarURL() });
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("back").setEmoji("⬅️").setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId("next").setEmoji("➡️").setStyle(ButtonStyle.Secondary).setDisabled(membersArray.length <= itemsPerPage)
            );

            const msg = await message.reply({ embeds: [getEmbed()], components: [row], allowedMentions: { repliedUser: false } });
            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on("collect", async (interaction) => {
                if (interaction.user.id !== message.author.id) return;

                if (interaction.customId === "next") currentPage++;
                if (interaction.customId === "back") currentPage--;

                const updatedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("back").setEmoji("⬅️").setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
                    new ButtonBuilder().setCustomId("next").setEmoji("➡️").setStyle(ButtonStyle.Secondary).setDisabled((currentPage + 1) * itemsPerPage >= membersArray.length)
                );

                await interaction.update({ embeds: [getEmbed()], components: [updatedRow] });
            });

            collector.on("end", () => {
                msg.edit({ components: [] }).catch(() => {});
            });
        } catch (error) {
            console.log(error);
            return message.reply({ embeds: [replyEmbeds.errorEmbed], allowedMentions: { repliedUser: false } });
        }
    }
};