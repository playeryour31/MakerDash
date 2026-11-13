const {
    Client,
    Collection,
    WebhookClient,
    PermissionsBitField,
    GatewayIntentBits,
    Partials,
    Events,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const config = require("../../Resources/Config.json");
const Colors = require("../../Resources/Colors.json");
const Tokens = new Database("/Database/Others/Tokens.json");
const AdminsDB = new Database("/Database/BotMaker/Admins.json");

module.exports = {
    name: "admins-actions",
    usage: [],
    botPermission: [],
    authorPermission: [],
    cooldowns: [0],
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            const bots = Tokens.get('Bots') || [];
            const botID = interaction.values[0].split("_")[0].trim();  
            const Selected = interaction.values[0].split("_")[1].trim();  
            const userBots = (bots || []).filter(bot => bot.ClientID === botID);
            const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
            if (!isOwner) { 
                return interaction.reply({ 
                    content: 'أنت لا تملك صلاحية إدارة هذا البوت.', 
                    ephemeral: true 
                });
            }

            if (Selected === "remove" || Selected === "add") {
                const modal = new ModalBuilder()
                    .setCustomId(`admins_${Selected}_${botID}`)
                    .setTitle(Selected === "add" ? "إضافة مشرف" : "إزالة مشرف");
                
                const userIdInput = new TextInputBuilder()
                    .setCustomId("id")
                    .setLabel("أدخل معرف المستخدم")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("معرف المستخدم")
                    .setRequired(true);
                
                const actionRow = new ActionRowBuilder().addComponents(userIdInput);
                modal.addComponents(actionRow);
                
                await interaction.showModal(modal);
            } else if (Selected === "adminslist") {
                let admins = AdminsDB.get(`Admins_${botID}`) || [];
                
                if (admins.length === 0) {
                    return interaction.reply({ content: "لا يوجد مشرفين لهذا البوت.", ephemeral: true });
                }

                const userListPromises = admins.map(async (adminID, index) => {
                    const user = await client.users.fetch(adminID).catch(() => ({ username: `${adminID}`, id: adminID }));
                    return `**${index + 1}.** \`${user.username} (${user.id})\``;
                });

                const userList = await Promise.all(userListPromises);

                const botClient = await client.users.fetch(botID).catch(() => ({ username: botID }));

                const embed = new EmbedBuilder()
                    .setColor(Colors.Main)
                    .setDescription(`## <:Admins:1393592375594717244> مشرفين بوت ${botClient.username}\n\n${userList.join("\n")}`);

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else if (Selected === "modifyadminpermissions") {
                await interaction.reply({ content: "هذه الميزة تحت التطوير حالياً.", ephemeral: true });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'حدث خطأ غير متوقع، الرجاء المحاولة لاحقاً.', ephemeral: true });
        }
    }
};
