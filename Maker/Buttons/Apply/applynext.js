const { ChatInputCommandInteraction } = require("discord.js");
const db = require("../../lib/applyDb")
const applyBtn = require("./apply")

module.exports = {
    name: "applynext",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
     * Continue multi-page Apply modal.
     * customId: requests_role_panelMessageId_applynext
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const parts = interaction.customId.split("_").map((p) => p.trim())
            // [requests, role, panelMessageId, applynext]
            const panelMessageId = parts[2]
            const session = await db.get(applyBtn.sessionKey(client.user.id, interaction.user.id))
            if (!session || session.panelMessageId !== panelMessageId) {
                return interaction.reply({
                    content: "انتهت جلسة التقديم. اضغط زر التقديم من جديد.",
                    ephemeral: true,
                })
            }
            if (session.expiresAt && Date.now() > session.expiresAt) {
                await db.delete(applyBtn.sessionKey(client.user.id, interaction.user.id))
                return interaction.reply({
                    content: "انتهت صلاحية جلسة التقديم. اضغط زر التقديم من جديد.",
                    ephemeral: true,
                })
            }

            let appData = await db.get("appData_" + panelMessageId + "_" + client.user.id) || null
            if (!appData) {
                return interaction.reply({
                    content: reply.Errors.Reply1.replace("[COMMAND]", "button"),
                    ephemeral: true,
                })
            }

            const nextPage = Number(session.page || 0)
            await applyBtn.showApplyModal(interaction, appData, nextPage, reply)
        } catch (error) {
            console.log(error)
            return interaction.reply({
                embeds: [replyEmbeds.errorEmbed],
                ephemeral: true,
            }).catch(() => {})
        }
    },
}
