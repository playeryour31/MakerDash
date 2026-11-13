const { Client, SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } = require("discord.js");
const { Database } = require("st.db");

const db = require("../../lib/featureDb")("stock_db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-stock')
        .setDescription('Remove specific items from a product\'s stock.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the product.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('stock')
                .setDescription('The items to be removed (separate them with a comma ,).')
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
            const guildId = interaction.guild.id;
            const productName = interaction.options.getString('name');
            const stockItemsString = interaction.options.getString('stock');
            const stockItemsToRemove = stockItemsString.split(',').map(item => item.trim());
            let products = db.get(`Products_${guildId}_${client.user.id}`) || [];
            let product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());

            if (!product) {
                return interaction.reply({
                    content: reply.Stock.Reply2,
                    ephemeral: true,
                });
            }

            if (!product.stock || product.stock.length === 0) {
                return interaction.reply({
                    content: reply.Stock.Reply26,
                    ephemeral: true,
                });
            }
            product.stock = product.stock.filter(item => !stockItemsToRemove.includes(item));
            db.set(`Products_${guildId}_${client.user.id}`, products);

            interaction.reply({
                content: reply.Stock.Reply27 + `[${stockItemsToRemove.join(', ')}] ` + reply.Stock.Reply28 + ` **${productName}**.`,
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
