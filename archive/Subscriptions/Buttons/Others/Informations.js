const { EmbedBuilder } = require("discord.js");
const { Database } = require("st.db");
const ConfigDB = new Database("./Subscriptions/Database/Makers/Messages");

module.exports = {
    name: "info",
    ownerOnly: false,
    run: async (client, interaction, args, config) => {
        try {
            const message = ConfigDB.get(`MessageInfo_${client.user.id}`) || "Normal";

            const formattedMessage = message.replace(/\\n/g, "\n");

            const eembed = new EmbedBuilder()
                .setColor(interaction.guild.members.me?.displayColor)
                .setDescription(formattedMessage === "Normal" ? "This IS Info Buttons" : formattedMessage);

            await interaction.reply({ embeds: [eembed], ephemeral: true });

        } catch (error) {
            console.log(error);
        }
    },
};
