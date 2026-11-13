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
const isImageUrl = require('is-image-url');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bc')
        .setDescription('Send a message to all members in the server.')
    .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to broadcast')
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
            const totalMembers = members.size;
            const totalBots = members.filter(member => member.user.bot).size;
            const totalExpected = totalMembers - totalBots;

            const statusEmbed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayHexColor)
                .setTitle('📢 Broadcast Status')
                .setDescription(`Total members in the server: **${totalMembers}**\n` +
                                `Total bots in the server: **${totalBots}**\n` +
                                `Expected members to receive message: **${totalExpected}**\n` +
                                `Successfully sent the message to **${successfulCount}** members.\n` +
                                `Failed to send to **${failedCount}** members:\n\`\`\`${failedMembers.length > 0 ? failedMembers.join('\n') : 'None'}\`\`\``)
                .setFooter({ text: `Sent by: ${interaction.user.tag}` });

            const logEmbed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayHexColor)
                .setTitle('📜 Broadcast Log')
                .setDescription('Broadcasting messages...\n\n');

            await interaction.reply({ embeds: [statusEmbed, logEmbed], ephemeral: false });

            members.forEach(member => {
                if (!member.user.bot) { 
                    member.send(`${userMessage}\n${member}`)
                        .then(() => {
                            successfulCount++;
                            logEmbed.setDescription(logEmbed.description + `✅ Sent to: ${member.user.tag}\n`);
                        })
                        .catch(err => {
                            failedCount++;
                            failedMembers.unshift(member.user.tag);
                            if (failedMembers.length > 10) {
                                failedMembers.pop();
                            }
                            logEmbed.setDescription(logEmbed.description + `❌ Failed to send to: ${member.user.tag} ${err.message}\n`);
                        });
                }
            });

            const updateInterval = setInterval(() => {
                statusEmbed.setDescription(`Total members in the server: **${totalMembers}**\n` +
                    `Total bots in the server: **${totalBots}**\n` +
                    `Expected members to receive message: **${totalExpected}**\n` +
                    `Successfully sent the message to **${successfulCount}** members.\n` +
                    `Failed to send to **${failedCount}** members:\n\`\`\`${failedMembers.length > 0 ? failedMembers.join('\n') : 'None'}\`\`\``);

                interaction.editReply({ embeds: [statusEmbed, logEmbed] });

                if (successfulCount + failedCount >= totalExpected) {
                    clearInterval(updateInterval);
                    logEmbed.setDescription(logEmbed.description + `\n✅ **Broadcast completed successfully**\n`);
                    interaction.editReply({ embeds: [statusEmbed, logEmbed] });
                }
            }, 3000);

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};