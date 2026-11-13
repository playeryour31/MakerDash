const {
    Client,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db");
const db = require("../../lib/featureDb")("stock_db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-stock')
        .setDescription("Add multiple items to a product's stock.")
        .addStringOption(option =>
            option.setName('name')
                .setDescription("The name of the product.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('stock')
                .setDescription("The items to be added (separate them with a comma). Example: item1, item2, item3")
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
			const limits = 100;
            const productName = interaction.options.getString('name');
            const stockItemsString = interaction.options.getString('stock');

            if (!stockItemsString.includes(",") && stockItemsString.split(" ").length > 1) {
                return interaction.reply({
                    content: reply.Stock.Reply4,
                    ephemeral: true,
                });
            }


            let products = db.get(`Products_${interaction.guild.id}_${client.user.id}`) || [];
            let product = products.find(p => p.name === productName);
            const stockItems = stockItemsString.includes(",") 
                ? stockItemsString.split(",").map(item => item.trim()).filter(item => item !== "")
                : [stockItemsString];
            if (stockItems.length > limits) {
                return interaction.reply({
                    content: reply.Stock.Reply5.replace("[Limits]", limits),
                    ephemeral: true,
                });
            }


            if (!product) {
                return interaction.reply({
                    content: reply.Stock.Reply2,
                    ephemeral: true,
                });
            }

            if (!product.stock) {
                product.stock = [];
            }

            product.stock.push(...stockItems);
            db.set(`Products_${interaction.guild.id}_${client.user.id}`, products);

            interaction.reply({
                content: reply.Stock.Reply6.replace("[Name]", productName).replace("[Items]", stockItems.join(', ')),
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
