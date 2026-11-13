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
        .setName('obc')
        .setDescription('Send a message to all online members in the server.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to broadcast to online members')
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
            const members = await interaction.guild.members.fetch();
            let successfulCount = 0;
            let failedCount = 0;
            const failedMembers = [];
            const onlineMembers = members.filter(member => member.presence?.status === 'online' && !member.user.bot);
            const totalOnline = onlineMembers.size;

            const statusEmbed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayHexColor)
                .setTitle('📢 Broadcast Status (Online Members)')
                .setDescription(`Total online members: **${totalOnline}**\n` +
                                `Successfully sent the message to **${successfulCount}** members.\n` +
                                `Failed to send to **${failedCount}** members:\n\`\`\`${failedMembers.length > 0 ? failedMembers.join('\n') : 'None'}\`\`\``)
                .setFooter({ text: `Sent by: ${interaction.user.tag}` });

            const logEmbed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayHexColor)
                .setTitle('📜 Broadcast Log (Online Members)')
                .setDescription('Broadcasting messages to online members...\n\n');

            await interaction.reply({ embeds: [statusEmbed, logEmbed], ephemeral: false });

            onlineMembers.forEach(member => {
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
                isDone: () => successfulCount + failedCount >= totalOnline,
                describe: () => `Total online members: **${totalOnline}**\n` +
                    `Successfully sent the message to **${successfulCount}** members.\n` +
                    `Failed to send to **${failedCount}** members:\n\`\`\`${failedMembers.length > 0 ? failedMembers.join('\n') : 'None'}\`\`\``,
                doneNote: '✅ **Broadcast to online members completed successfully**',
                intervalMs: 1500,
            });
        } catch (error) {
            console.log(error);
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    },
};
