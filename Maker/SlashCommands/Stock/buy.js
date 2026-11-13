const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const db = require("../../lib/featureDb")("stock_db");
const db1 = require("../../lib/featureDb")("sys_stock");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Purchase a specific product.')
        .addStringOption(option =>
            option.setName('product')
                .setDescription('The name of the product you want to purchase.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('The quantity you want to purchase.')
                .setRequired(true)
        ),
    type: "Stock",

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async run(client, interaction, language, reply, replyEmbeds) {
        try {
            const productName = interaction.options.getString('product');
            const quantity = interaction.options.getInteger('quantity');
            const status = db.get(`Status_${interaction.guild.id}_${client.user.id}`) || false;
            const products = db.get(`Products_${interaction.guild.id}_${client.user.id}`) || [];
            const product = products.find(p => p.name === productName);
            
            if (!status) {
                return interaction.reply({
                    content: reply.Stock.Reply7,
                    ephemeral: true,
                });
            }

            const buy = db1.get(`${interaction.user.id}_${interaction.guild.id}_${client.user.id}`);
            if (buy) {
                return interaction.reply({ content: reply.Stock.Reply8, ephemeral: true });
            }

            if (!product) {
                return interaction.reply({
                    content: reply.Stock.Reply2,
                    ephemeral: true,
                });
            }

            if (product.stock.length < quantity) {
                return interaction.reply({
                    content: reply.Stock.Reply9.replace("[Limits]", product.stock.length),
                    ephemeral: false,
                });
            }

            const randomNumber = crypto.randomInt(100000, 999999);
            const pricePerItem = product.price || 0;
            const totalPrice = pricePerItem * quantity;
            const finalPrice = Math.floor(totalPrice * (20 / 19) + 1);

            const paymentData = db.get(`paymentData_${interaction.guild.id}_${client.user.id}`) || {};
            const recipient = paymentData.recipientId;
            const probotId = paymentData.probotId;

            if (!recipient || !probotId) {
                return interaction.reply({
                    content: reply.Stock.Reply10,
                    ephemeral: false,
                });
            }

            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('copy')
                    .setLabel(reply.Stock.Reply11)
                    .setStyle(ButtonStyle.Secondary)
            );

            const paymentEmbed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayColor)
                .setDescription(`\`\`\`#credit ${recipient} ${finalPrice}\`\`\`\n` + reply.Stock.Reply12)
                .setTimestamp(Date.now() + 60 * 3 * 1000)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

            const transferMessage = await interaction.reply({ embeds: [paymentEmbed], components: [button] });

            db1.set(`${interaction.user.id}_${interaction.guild.id}_${client.user.id}`, true);
            const collectorFilter = m =>
                m.content.includes(totalPrice.toString()) &&
                (m.content.includes(recipient) || m.content.includes(`<@${recipient}>`)) &&
                m.author.id === probotId;

            const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, max: 1, time: 180000 });
            
            collector.on('collect', async () => {
                db1.delete(`${interaction.user.id}_${interaction.guild.id}_${client.user.id}`);
                
                const purchasedItems = product.stock.splice(0, quantity);
                db.set(`Products_${interaction.guild.id}_${client.user.id}`, products);

                const successEmbed = new EmbedBuilder()
                    .setDescription(reply.Stock.Reply13)
                    .setColor(interaction.guild.members.me.displayColor)
                    .setTimestamp();

                const storagePath = path.join(__dirname, "../../Json-Database/Storage/Stock");
                if (!fs.existsSync(storagePath)) {
                    fs.mkdirSync(storagePath, { recursive: true });
                }
                
                const filePath = path.join(storagePath, `Products_${interaction.user.id}_${randomNumber}_${client.user.id}.txt`);
                fs.writeFileSync(filePath, purchasedItems.join("\n"), "utf8");
                const fileAttachment = new AttachmentBuilder(filePath);

                const goodsEmbed = new EmbedBuilder()
                    .setTitle(reply.Stock.Reply14.Title)
                    .setDescription(reply.Stock.Reply14.Description)
                    .addFields(
                        { name: reply.Stock.Reply14.Field1, value: `**${productName}**`, inline: true },
                        { name: reply.Stock.Reply14.Field2, value: `**${quantity}**`, inline: true },
                        { name: reply.Stock.Reply14.Field3, value: `**${pricePerItem}(${finalPrice}) ${reply.Stock.Reply17}**`, inline: true },
                        { name: reply.Stock.Reply14.Field4, value: `**#${randomNumber}**`, inline: true },
                        { name: reply.Stock.Reply14.Field5, value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                    )
                    .setColor(interaction.guild.members.me.displayColor)
                    .setTimestamp();

                await transferMessage.edit({ embeds: [successEmbed], content: `${interaction.user}`, components: [] });
                await interaction.user.send({ embeds: [goodsEmbed], files: [fileAttachment] }).catch(() => {
                    interaction.followUp({
                        content: reply.Stock.Reply15,
                        ephemeral: false,
                    });
                });
            });

            collector.on('end', collected => {
                db1.delete(`${interaction.user.id}_${interaction.guild.id}_${client.user.id}`);
                if (collected.size === 0) {
                    interaction.editReply({
                        content: reply.Stock.Reply16,
                        embeds: [],
                        components: [],
                    });
                }
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