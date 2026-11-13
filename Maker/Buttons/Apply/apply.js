const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ChatInputCommandInteraction,
} = require("discord.js");
const db = require("../../lib/applyDb")
const {
    normalizeQuestions,
    questionsForPage,
    pageCount,
    buildTextInput,
    DISCORD_MODAL_MAX,
} = require("../../Utils/applyQuestions")

function sessionKey(botId, userId) {
    return `Apply_Draft_${botId}_${userId}`
}

function resolveQuestions(appData) {
    // Prefer questions[]; also recover if ask1..ask5 were wrongly saved as objects
    const fromQuestions = Array.isArray(appData.questions) ? appData.questions : [];
    const fromLegacy = [
        appData.ask1,
        appData.ask2,
        appData.ask3,
        appData.ask4,
        appData.ask5,
    ];
    const raw = fromQuestions.length ? fromQuestions : fromLegacy;
    return normalizeQuestions(raw);
}

async function showApplyModal(interaction, appData, page, reply) {
    const questions = resolveQuestions(appData)
    const pageQuestions = questionsForPage(questions, page)
    if (!pageQuestions.length) {
        return interaction.reply({
            content: reply.Errors?.Reply1?.replace?.("[COMMAND]", "button") || "No questions configured.",
            ephemeral: true,
        }).catch(() => {})
    }

    const totalPages = pageCount(questions)
    const titleBase = reply.Apply?.Asks?.t || "Application"
    const title =
        totalPages > 1
            ? `${String(titleBase).slice(0, 36)} (${page + 1}/${totalPages})`
            : String(titleBase).slice(0, 45)

    const requests = interaction.customId.split("_")[0].trim()
    const role = interaction.customId.split("_")[1].trim()

    const modal = new ModalBuilder()
        .setCustomId(`${requests}_${role}_apply`)
        .setTitle(title)

    const rows = pageQuestions.map((q, i) =>
        new ActionRowBuilder().addComponents(
            buildTextInput(TextInputBuilder, TextInputStyle, q, i),
        ),
    )
    modal.addComponents(...rows)
    await interaction.showModal(modal)
}

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
            let check = await db.get("Applied_" + interaction.message.id + "_" + client.user.id) || []
            if (check.includes(interaction.user.id))
                return interaction.reply({ content: reply.Apply.Reply17, ephemeral: true, allowedMentions: { repliedUser: false } })
            let status = await db.get("applectionStatus_" + interaction.message.id + "_" + client.user.id) || "on"
            if (status == "off")
                return interaction.reply({ content: reply.Apply.Reply18, ephemeral: true, allowedMentions: { repliedUser: false } })

            const requests = interaction.customId.split("_")[0].trim()
            const role = interaction.customId.split("_")[1].trim()
            let appData = await db.get("appData_" + interaction.message.id + "_" + client.user.id) || null
            if (!appData) return interaction.reply({ content: reply.Errors.Reply1.replace("[COMMAND]", "button"), ephemeral: true, allowedMentions: { repliedUser: false } })

            const questions = resolveQuestions(appData)
            if (!questions.length) {
                return interaction.reply({ content: "لا توجد أسئلة مُعدّة لهذه اللوحة.", ephemeral: true })
            }

            await db.set(sessionKey(client.user.id, interaction.user.id), {
                panelMessageId: interaction.message.id,
                requests,
                role,
                page: 0,
                answers: [],
                totalPages: pageCount(questions),
                expiresAt: Date.now() + 30 * 60 * 1000,
            })

            await showApplyModal(interaction, appData, 0, reply)
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
    showApplyModal,
    sessionKey,
    resolveQuestions,
    DISCORD_MODAL_MAX,
}
