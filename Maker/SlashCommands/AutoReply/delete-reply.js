const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { Database } = require("st.db");
const replydb = require("../../lib/featureDb")("sys_reply");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delete-reply")
        .setDescription("Delete an automatic reply from the database.")
        .addStringOption(option =>
            option.setName("word")
                .setDescription("The trigger word you want to remove.")
                .setRequired(true)
        ),
    
    type: "AutoReply",
    botP: [PermissionFlagsBits.ManageGuild],
    userP: [PermissionFlagsBits.ManageGuild],
    P: "ManageGuild",
    support: false,
    ownerOnly: false,

    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const guildId = interaction.guild.id;
            const botId = client.user.id;
            const word = interaction.options.getString("word").toLowerCase();

            const key = `Replies_${guildId}_${botId}`;
            const replies = replydb.get(key) || [];
            const index = replies.findIndex(r => r.word === word);
            if (index === -1) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle(reply.System.Reply5)
                    .setDescription(reply.System.Reply6.replace("[Word]", word));
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            replies.splice(index, 1);
            replydb.set(key, replies);

            const embed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayColor)
                .setTitle(reply.System.Reply7)
                .setDescription(reply.System.Reply8.replace("[Word]", word));
            await interaction.reply({ embeds: [embed], ephemeral: true });

          } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [replyEmbeds.errorEmbed] });
        }
    }
};