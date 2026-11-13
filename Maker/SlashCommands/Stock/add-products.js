const {
    Client,
    EmbedBuilder,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChatInputCommandInteraction,
} = require("discord.js");
const { Database } = require("st.db");

const db = require("../../lib/featureDb")("stock_db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-products')
        .setDescription('Add a new product with a price.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Product name.')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('price')
                .setDescription('Product price.')
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
            const productPrice = interaction.options.getNumber('price');
            let products = db.get(`Products_${interaction.guild.id}_${client.user.id}`) || [];
            if (products.some(product => product.name === productName)) {
                return interaction.reply({
                    content: reply.Stock.Reply1,
                    ephemeral: true,
                });
            }

            products.push({ name: productName, price: productPrice });
            db.set(`Products_${interaction.guild.id}_${client.user.id}`, products);

            interaction.reply({
                content: reply.Stock.Reply3.replace("[Name]", productName).replace("[Price]", productPrice),
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
