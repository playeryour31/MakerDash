const {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Enable or disable slowmode on a channel.')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Set the slowmode duration (e.g., 1s, 5m, 1h, off)')
                .setRequired(true)),
    type: "System",
    botP: [PermissionFlagsBits.ManageChannels],
    userP: [PermissionFlagsBits.ManageChannels],
    P: "ManageChannels",
    support: false,
    ownerOnly: false,
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const timeInput = interaction.options.getString('time');
            const channel = interaction.channel;

            if (timeInput.toLowerCase() === 'off') {
                await channel.setRateLimitPerUser(0);
                return interaction.reply({ content: reply.System.Slowmode1 + `${channel}.`, ephemeral: false });
            }

            const timeMap = { s: 1, m: 60, h: 3600 };
            const match = timeInput.match(/(\d+)(s|m|h)/);
            if (!match) {
                return interaction.reply({ content: reply.System.Slowmode2, ephemeral: false });
            }

            const [, value, unit] = match;
            const slowmodeDuration = parseInt(value) * timeMap[unit];
            if (slowmodeDuration > 21600) {
                return interaction.reply({ content: reply.System.Slowmode3, ephemeral: false });
            }

            await channel.setRateLimitPerUser(slowmodeDuration);
			interaction.reply({ 
  content: reply.System.Slowmode4
    .replace("[Time]", timeInput)
    .replace("[Channel]", channel), 
  ephemeral: false 
});
        } catch (error) {
            console.log(error);
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true });
        }
    },
};
