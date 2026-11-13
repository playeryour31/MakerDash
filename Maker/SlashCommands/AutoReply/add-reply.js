const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");
const { Database } = require("st.db");
const replydb = require("../../lib/featureDb")("sys_reply");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("add-reply")
        .setDescription("Add an automatic reply to the bot's database.")
        .addStringOption(option =>
            option.setName("word")
                .setDescription("The trigger word for the reply.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("response")
                .setDescription("The response message.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reply_type")
                .setDescription("Choose how the bot should respond.")
                .setRequired(false)
                .addChoices(
                    { name: "Reply", value: "true" },
                    { name: "Send Message", value: "false" }
                )
        )
        .addStringOption(option =>
            option.setName("includes")
                .setDescription("Should the bot respond to partial matches?")
                .setRequired(false)
                .addChoices(
                    { name: "True", value: "true" },
                    { name: "False", value: "false" }
                )
        )
        .addRoleOption(option =>
            option.setName("role")
                .setDescription("Restrict the reply to users with this role (optional).")
                .setRequired(false)
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
            const response = interaction.options.getString("response");
            const replyType = interaction.options.getString("reply_type") === "true";
            const includes = interaction.options.getString("includes") === "true";
            const role = interaction.options.getRole("role");

            const key = `Replies_${guildId}_${botId}`;
            const replies = replydb.get(key) || [];

            const existingReply = replies.find(r => r.word === word);
            if (existingReply) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle(reply.System.Reply1)
                    .setDescription(reply.System.Reply2.replace("[Word]", word));

                return interaction.reply({ embeds: [embed], ephemeral: false });
            }

            replies.push({
                word,
                responses: [response],
                includes,
                reply: replyType,
                role: role ? role.id : null
            });

            replydb.set(key, replies);

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle(reply.System.Reply3)
                .setDescription(reply.System.Reply4.replace("[Word]", word).replace("[Response]", response));
            await interaction.reply({ embeds: [embed], ephemeral: true });
             } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [replyEmbeds.errorEmbed] });
        }
    }
};