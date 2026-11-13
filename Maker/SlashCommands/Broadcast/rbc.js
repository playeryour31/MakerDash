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
const { reportBroadcastProgress } = require("../../lib/broadcastProgress");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rbc')
        .setDescription('Send a message to all members with a specific role.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to broadcast')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to target')
                .setRequired(true)),
    type: "Broadcast",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: true,
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const userMessage = interaction.options.getString('message');
            const targetRole = interaction.options.getRole('role');
            const members = await interaction.guild.members.fetch();
            let successfulCount = 0;
            let failedCount = 0;
            const failedMembers = [];
            const roleMembers = members.filter(member => member.roles.cache.has(targetRole.id) && !member.user.bot);
            const totalRoleMembers = roleMembers.size;

            const statusEmbed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayHexColor)
                .setTitle(`📢 Broadcast Status (Role: ${targetRole.name})`)
                .setDescription(`Total members with role **${targetRole.name}**: **${totalRoleMembers}**\n` +
                                `Successfully sent the message to **${successfulCount}** members.\n` +
                                `Failed to send to **${failedCount}** members:\n\`\`\`${failedMembers.length > 0 ? failedMembers.join('\n') : 'None'}\`\`\``)
                .setFooter({ text: `Sent by: ${interaction.user.tag}` });

            const logEmbed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayHexColor)
                .setTitle(`📜 Broadcast Log (Role: ${targetRole.name})`)
                .setDescription(`Broadcasting messages to members with role: ${targetRole.name}...\n\n`);

            await interaction.reply({ embeds: [statusEmbed, logEmbed], ephemeral: false });

            roleMembers.forEach(member => {
                member.send(`${userMessage}\n${member}`)
                    .then(() => {
                        successfulCount++;
                        logEmbed.setDescription(logEmbed.description + `✅ Sent to: ${member.user.tag}\n`);
                    })
                    .catch(err => {
                        failedCount++;
                        failedMembers.push(member.user.tag);
                        logEmbed.setDescription(logEmbed.description + `❌ Failed to send to: ${member.user.tag}\nError: ${err.message}\n`);
                    });
            });

            reportBroadcastProgress({
                interaction,
                statusEmbed,
                logEmbed,
                isDone: () => successfulCount + failedCount >= totalRoleMembers,
                describe: () => `Total members with role **${targetRole.name}**: **${totalRoleMembers}**\n` +
                    `Successfully sent the message to **${successfulCount}** members.\n` +
                    `Failed to send to **${failedCount}** members:\n\`\`\`${failedMembers.length > 0 ? failedMembers.join('\n') : 'None'}\`\`\``,
                doneNote: `✅ **Broadcast to members with role ${targetRole.name} completed successfully**`,
                intervalMs: 1500,
            });
        } catch (error) {
            console.log(error);
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    },
};
