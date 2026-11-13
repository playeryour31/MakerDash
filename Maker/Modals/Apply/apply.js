const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChatInputCommandInteraction,
} = require("discord.js");
const db = require("../../lib/applyDb")
const applyBtn = require("../../Buttons/Apply/apply")
const {
    normalizeQuestions,
    questionsForPage,
    pageCount,
    DISCORD_MODAL_MAX,
} = require("../../Utils/applyQuestions")

module.exports = {
    name: "apply",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const requests = interaction.customId.split("_")[0].trim()
            const role = interaction.customId.split("_")[1].trim()
            const key = applyBtn.sessionKey(client.user.id, interaction.user.id)
            let session = await db.get(key) || null

            // Fallback: derive panel from recent message if session missing (legacy single-page)
            let panelMessageId = session?.panelMessageId
            if (!panelMessageId && interaction.message?.id) {
                panelMessageId = interaction.message.id
            }

            // Session is required for multi-page; try recover from Applied check path
            if (!session || !panelMessageId) {
                return interaction.reply({
                    content: "انتهت جلسة التقديم. اضغط زر التقديم من جديد.",
                    ephemeral: true,
                })
            }

            if (session.expiresAt && Date.now() > session.expiresAt) {
                await db.delete(key)
                return interaction.reply({
                    content: "انتهت صلاحية جلسة التقديم. اضغط زر التقديم من جديد.",
                    ephemeral: true,
                })
            }

            panelMessageId = session.panelMessageId
            let check = await db.get("Applied_" + panelMessageId + "_" + client.user.id) || []
            if (check.includes(interaction.user.id))
                return interaction.reply({ content: reply.Apply.Reply17, ephemeral: true, allowedMentions: { repliedUser: false } })

            let appData = await db.get("appData_" + panelMessageId + "_" + client.user.id)
            if (!appData) return interaction.reply({ content: reply.Errors.Reply1.replace("[COMMAND]", "modal"), ephemeral: true, allowedMentions: { repliedUser: false } })

            const questions = applyBtn.resolveQuestions(appData)
            const page = Number(session.page || 0)
            const pageQuestions = questionsForPage(questions, page)

            const pageAnswers = []
            for (let i = 0; i < pageQuestions.length; i++) {
                const q = pageQuestions[i]
                const customId = `ask${i + 1}`
                let ans = ""
                try {
                    ans = interaction.fields.getTextInputValue(customId)
                } catch {
                    ans = ""
                }
                pageAnswers.push({ qes: q.label, ans, questionId: q.id })
            }

            const allAnswers = [...(session.answers || []), ...pageAnswers]
            const totalPages = pageCount(questions)
            const nextPage = page + 1

            if (nextPage < totalPages) {
                await db.set(key, {
                    ...session,
                    page: nextPage,
                    answers: allAnswers,
                    requests,
                    role,
                })
                const remaining = questions.length - nextPage * DISCORD_MODAL_MAX
                const button = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${requests}_${role}_${panelMessageId}_applynext`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji("➡️")
                        .setLabel(`متابعة الأسئلة (${nextPage + 1}/${totalPages})`),
                )
                return interaction.reply({
                    content: `تم حفظ إجابات هذه الصفحة.\nيتبقى ${remaining} سؤال — اضغط للمتابعة.`,
                    components: [button],
                    ephemeral: true,
                })
            }

            // Final page — submit application
            await db.delete(key)

            let requestsChannel = interaction.guild.channels.cache.get(requests)
            if (!requestsChannel)
                return interaction.reply({ content: reply.Apply.Reply10, ephemeral: true, allowedMentions: { repliedUser: false } })

            let msg = await interaction.reply({ content: reply.Others.Reply19, ephemeral: true })

            let qess = allAnswers.map((ask) => ({
                name: "- " + ask.qes,
                value: "> " + (ask.ans || "—").slice(0, 1020),
            }))
            // Discord embed max 25 fields
            qess = qess.slice(0, 25)

            const embed = new EmbedBuilder()
                .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                .setColor("Blue")
                .setTimestamp()
                .setDescription(reply.Apply.Reply13.replace("[AUTHOR]", interaction.user).replace("[ROLE]", "<@&" + role + ">"))
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .addFields(...qess)

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(interaction.user.id + "_" + role + "_accept")
                        .setStyle(ButtonStyle.Success)
                        .setLabel("Accept"),
                    new ButtonBuilder()
                        .setCustomId(interaction.user.id + "_" + role + "_reject")
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Reject"),
                );

            requestsChannel.send({ embeds: [embed], components: [buttons] }).then(async (sent) => {
                msg.edit({ content: reply.Apply.Reply14 }).catch(() => {})
                // Applied_* is still sync via JSON fallback path when API off;
                // prefer set with full list for async applyDb compatibility.
                const appliedKey = "Applied_" + panelMessageId + "_" + client.user.id
                const applied = (await db.get(appliedKey)) || []
                const appliedList = Array.isArray(applied) ? applied : []
                if (!appliedList.map(String).includes(String(interaction.user.id))) {
                    appliedList.push(interaction.user.id)
                }
                await db.set(appliedKey, appliedList)

                const pendingKey = `Pending_Applications_${client.user.id}`
                const pending = await db.get(pendingKey) || []
                const list = Array.isArray(pending) ? pending : []
                list.push({
                    id: `${sent.id}_${interaction.user.id}`,
                    userId: interaction.user.id,
                    roleId: role,
                    channelId: requestsChannel.id,
                    messageId: sent.id,
                    panelMessageId,
                    guildId: interaction.guild.id,
                    status: 'pending',
                    answers: allAnswers,
                    createdAt: new Date().toISOString(),
                })
                await db.set(pendingKey, list)
            }).catch(() => {
                msg.edit({ content: reply.Apply.Reply12 || "Failed to send application." }).catch(() => {})
            })

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } }).catch(() => {
                return interaction.channel.send({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
            })
        }
    }
}
