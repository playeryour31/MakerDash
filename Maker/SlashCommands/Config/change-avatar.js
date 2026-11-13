const {
    SlashCommandBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const fetch = require('node-fetch').default;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('change-avatar')
        .setDescription('Change bot\'s avatar.')
        .addAttachmentOption(p => p
            .setName('image')
            .setDescription('Upload the image')
            .setRequired(true))
    ,
    type: "Config",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: true,
    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async run(client, interaction, language, reply, replyEmbeds, name) {
        const safeEdit = async (payload) => {
            try {
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply(payload);
                }
                return interaction.reply({
                    ...payload,
                    ephemeral: true,
                    allowedMentions: { repliedUser: false },
                });
            } catch {
                return null;
            }
        };

        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: false });
            }

            const png = interaction.options.getAttachment("image");
            const contentType = String(png?.contentType || '');
            const isImage =
                contentType.startsWith('image') ||
                /\.(png|jpe?g|gif|webp)(\?|$)/i.test(String(png?.url || ''));

            if (!png?.url || !isImage) {
                return safeEdit({ content: reply.Owner.Reply7 });
            }

            const response = await fetch(png.url);
            if (!response.ok) {
                return safeEdit({ embeds: [replyEmbeds.errorEmbed] });
            }
            const buffer = await response.buffer();
            await client.user.setAvatar(buffer);
            return safeEdit({ content: `${reply.Owner.Reply1}` });
        } catch (error) {
            console.log(error);
            const aborted =
                error?.name === 'AbortError' ||
                /aborted|timeout/i.test(String(error?.message || ''));
            if (aborted) {
                return safeEdit({
                    content:
                        'تعذر تغيير الأفاتار الآن (انتهت المهلة أو حد ديسكورد). حاول لاحقاً.',
                });
            }
            return safeEdit({ embeds: [replyEmbeds.errorEmbed] });
        }
    },
};
