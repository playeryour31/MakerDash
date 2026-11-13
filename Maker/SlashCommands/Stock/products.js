const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChatInputCommandInteraction, 
    EmbedBuilder 
} = require("discord.js");
const { Database } = require("st.db");

const db = require("../../lib/featureDb")("stock_db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('products')
        .setDescription('Display all products with the available stock for each product.'),
    type: "Stock",
    botP: [],
    userP: [],
    P: "Administrator",
    support: false,
    ownerOnly: false,
    

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    
    async run(client, interaction, language, reply, replyEmbeds) {
        try {

            let products = db.get(`Products_${interaction.guild.id}_${client.user.id}`) || [];
if (!Array.isArray(products)) {
      products = [];
    }
            if (products.length === 0) {
                return interaction.reply({
                    content: reply.Stock.Reply23,
                    ephemeral: true,
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(reply.Stock.Reply24)
                .setColor(interaction.guild.members.me.displayColor)
                .setTimestamp();

            products.forEach(product => {
                const stockCount = Array.isArray(product.stock) ? product.stock.length : 0;
                embed.addFields({
                    name: `${product.name}`, 
                    value: reply.Stock.Reply25.replace("[Price]", product.price || 0).replace("[Stock]", stockCount || 0),
                    inline: false,
                });
            });

            interaction.reply({
                embeds: [embed],
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
