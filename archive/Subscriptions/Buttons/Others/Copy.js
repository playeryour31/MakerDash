module.exports = {
    name: "copy",
    ownerOnly: false,
    run: async (client, interaction, args, config) => {
        try {
            const Embed = interaction.message.embeds[0];
             interaction.reply({ content: Embed.description.match(/```([^`]*)```/)[1], ephemeral: true });
        } catch (error) {
            console.log(error);
        }
    },
};