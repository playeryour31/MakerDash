const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChatInputCommandInteraction
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban-all')
        .setDescription('Unbans all members in the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    type: "System",
    botP: [PermissionFlagsBits.BanMembers],
    userP: [PermissionFlagsBits.BanMembers],
    P: "BanMembers",
    ownerOnly: false,

    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const bans = await interaction.guild.bans.fetch();
            const unbannedCount = bans.size;

            if (unbannedCount > 0) {
                for (const ban of bans.values()) {
                    try {
                        await interaction.guild.members.unban(ban.user.id);
                    } catch (error) {
                        console.log(error);
                    }
                }

                interaction.editReply({
                    content: reply.System.UnBanAll2.replace("[Number]", unbannedCount),
                    allowedMentions: { repliedUser: false }
                });

            } else {
                interaction.editReply({
                    content: reply.System.UnBanAll1,
                    allowedMentions: { repliedUser: false }
                });
            }
        } catch (error) {
            console.log(error);
            return interaction.editReply({ embeds: [replyEmbeds.errorEmbed], allowedMentions: { repliedUser: false } });
        }
    },
};