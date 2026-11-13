const { Message } = require("discord.js");
const fetch = require('node-fetch').default;

module.exports = {
    name: "change-avatar",
    type: "Config",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: true,
    /**
     * @param {Message} message
     */
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            if (!message.attachments.size) {
                return message.reply({
                    embeds: [replyEmbeds.usageEmbed],
                    allowedMentions: { repliedUser: false },
                });
            }

            const png = message.attachments.first();
            const contentType = String(png?.contentType || '');
            const isImage =
                contentType.startsWith('image') ||
                /\.(png|jpe?g|gif|webp)(\?|$)/i.test(String(png?.url || ''));

            if (!png?.url || !isImage) {
                return message.reply({
                    content: reply.Owner.Reply7,
                    allowedMentions: { repliedUser: false },
                });
            }

            const response = await fetch(png.url);
            if (!response.ok) {
                return message.reply({
                    embeds: [replyEmbeds.notFoundEmbed],
                    allowedMentions: { repliedUser: false },
                });
            }
            const buffer = await response.buffer();
            await client.user.setAvatar(buffer);
            return message.reply({
                content: reply.Owner.Reply1,
                allowedMentions: { repliedUser: false },
            });
        } catch (error) {
            console.log(error);
            const aborted =
                error?.name === 'AbortError' ||
                /aborted|timeout/i.test(String(error?.message || ''));
            if (aborted) {
                return message.reply({
                    content:
                        'تعذر تغيير الأفاتار الآن (انتهت المهلة أو حد ديسكورد). حاول لاحقاً.',
                    allowedMentions: { repliedUser: false },
                });
            }
            return message.reply({
                embeds: [replyEmbeds.notFoundEmbed],
                allowedMentions: { repliedUser: false },
            });
        }
    }
};
