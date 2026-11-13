const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
	AttachmentBuilder 
} = require("discord.js");
const { Database } = require("st.db");
const db = require("../../lib/featureDb")("stock_db");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto"); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give products to a specific user.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user you want to give the product to.')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('product')
                .setDescription('The name of the product.')
                .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('quantity')
                .setDescription('The quantity to give.')
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
            const targetUser = interaction.options.getUser('user');
            const productName = interaction.options.getString('product');
            const quantity = interaction.options.getInteger('quantity');

            let products = db.get(`Products_${interaction.guild.id}_${client.user.id}`) || [];
            const product = products.find(p => p.name === productName);

            if (!product) {
                return interaction.reply({
                    content: reply.Stock.Reply2,
                    ephemeral: true,
                });
            }

            if (product.stock.length < quantity) {
                return interaction.reply({
                    content: reply.Stock.Reply20 + `**${product.stock.length}**.`,
                    ephemeral: true,
                });
            }
            const givenItems = product.stock.splice(0, quantity);
            db.set(`Products_${interaction.guild.id}_${client.user.id}`, products); 
            const successEmbed = new EmbedBuilder()
                .setTitle(reply.Stock.Reply21)
                .setDescription(reply.Stock.Reply22 + `${targetUser}.`)
                .setColor(interaction.guild.members.me.displayColor)
                .setTimestamp();

            await interaction.reply({ content: `${interaction.user}`, embeds: [successEmbed] });

const randomNumber = crypto.randomInt(100000, 999999);



             const storagePath = path.join(__dirname, "../../Json-Database/Storage/Stock");
            if (!fs.existsSync(storagePath)) {
                fs.mkdirSync(storagePath, { recursive: true });
            }

            const filePath = path.join(storagePath, `Products_${targetUser.id}_${randomNumber}_${client.user.id}_${interaction.guild.id}.txt`);
            fs.writeFileSync(filePath, givenItems.join("\n"), "utf8");
            const fileAttachment = new AttachmentBuilder(filePath);

                const goodsEmbed = new EmbedBuilder()
                    .setTitle(reply.Stock.Reply14.Title)
                    .setDescription(reply.Stock.Reply14.Description)
                    .addFields(
                        { name: reply.Stock.Reply14.Field1, value: `**${productName}**`, inline: true },
                        { name: reply.Stock.Reply14.Field2, value: `**${quantity}**`, inline: true },
                        { name: reply.Stock.Reply14.Field6, value: interaction.user.tag, inline: true },
                        { name: reply.Stock.Reply14.Field4, value: `**#${randomNumber}**`, inline: true },
                        { name: reply.Stock.Reply14.Field5, value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                    )
                    .setColor(interaction.guild.members.me.displayColor)
                    .setTimestamp();

            await targetUser.send({ embeds: [goodsEmbed], files: [fileAttachment] });

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
