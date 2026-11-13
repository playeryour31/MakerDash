const { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } = require("discord.js");
const { Database } = require("st.db");
const db = require("../../lib/featureDb")("stock_db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-product')
        .setDescription('Edit a product.')
        .addStringOption(option =>
            option.setName('old_name')
                .setDescription('The current name of the product.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('new_name')
                .setDescription('The new name of the product.')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('price')
                .setDescription('The new price of the product.')
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
            const oldName = interaction.options.getString('old_name');
            const newName = interaction.options.getString('new_name');
            const newPrice = interaction.options.getNumber('price');

            let products = db.get(`Products_${interaction.guild.id}_${client.user.id}`) || [];
            const product = products.find(p => p.name === oldName);

            if (!product) {
                return interaction.reply({
                    content: reply.Stock.Reply2,
                    ephemeral: true,
                });
            }

            product.name = newName;
            product.price = newPrice;
            db.set(`Products_${interaction.guild.id}_${client.user.id}`, products);

            interaction.reply({
                content: reply.Stock.Reply19.replace("[OldName]", oldName).replace("[NewName]", newName).replace("[Price]", newPrice),
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
