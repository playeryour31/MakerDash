const { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } = require("discord.js");
const { Database } = require("st.db");

const db = require("../../lib/featureDb")("stock_db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete-product')
        .setDescription('Delete a product.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the product to delete.')
                .setRequired(true)
        ),
    type: "Stock",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    support: false,
    ownerOnly: true,

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async run(client, interaction, language, reply, replyEmbeds) {
        try {
            const productName = interaction.options.getString('name');

            let products = db.get(`Products_${interaction.guild.id}_${client.user.id}`) || [];
            const productIndex = products.findIndex(p => p.name === productName);

            if (productIndex === -1) {
                return interaction.reply({
                    content: reply.Stock.Reply2,
                    ephemeral: true,
                });
            }
            products.splice(productIndex, 1);
            db.set(`Products_${interaction.guild.id}_${client.user.id}`, products);

            interaction.reply({
                content: reply.Stock.Reply2.replace("[Name]", productName),
                allowedMentions: { repliedUser: false },
            });

        } catch (error) {
            console.error(error);
            interaction.reply({
                embeds: [replyEmbeds.errorEmbed],
                ephemeral: true,
                allowedMentions: { repliedUser: false },
            });
        }
    },
};
