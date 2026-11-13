const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");
const { Database } = require("st.db");
const TempDB = require("../../lib/featureDb")("sys_voicetemp");
const TempCatchDB = require("../../lib/featureDb")("temp_channels");

module.exports = {
    name: "set_name",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction, language, reply, embeds) => {
        try {
            const user = interaction.member;
            const guild = interaction.guild;

            const status = await TempDB.get(`${client.user?.id}_${guild.id}_${user.id}`);
            if (!status) {
                return interaction.reply({
                    content: reply.TempVoice.Reply2, 
                    ephemeral: true,
                });
            }

            const voiceChannel = user.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    content: reply.TempVoice.Reply31, 
                    ephemeral: true,
                });
            }
const settings = await TempCatchDB.get(`Channel_${guild.id}_${client.user.id}_${voiceChannel.id}`);
            if (!settings) {
                return interaction.reply({
                    content: reply.TempVoice.Reply22,
                    ephemeral: true,
                });
            }
const owner = settings.owner;
if (user.id !== owner) {
    return interaction.reply({
        content: reply.TempVoice.Reply30,
        ephemeral: true
    });
}
            const modal = new ModalBuilder()
                .setCustomId(`setname_${voiceChannel.id}`)
                .setTitle(reply.TempVoice.Modals.Title1);

            const ask1 = new TextInputBuilder()
                .setCustomId("name")
                .setRequired(true)
                .setLabel(reply.TempVoice.Modals.Label1)
                .setPlaceholder(reply.TempVoice.Modals.Placeholder1) 
                .setMaxLength(45) 
                .setStyle(TextInputStyle.Short);

            const actionRow = new ActionRowBuilder().addComponents(ask1);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        } catch (error) {
            console.error(error);
            return interaction.reply({
                embeds: [replyEmbeds.errorEmbed],
                ephemeral: true,
                allowedMentions: { repliedUser: false }
            });
        }
    }
};
