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

const { Database } = require("st.db");
const config = require("../../../Main/Resources/Config.json");
const Tokens = new Database("/Database/Others/Tokens.json");
const AdminsDB = new Database("/Database/BotMaker/Admins.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");

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
        content: 'You do not have permission to manage this bot.', 
        ephemeral: true 
    });
}

            if (Selected === "remove" || Selected === "add") {
                const modal = new ModalBuilder()
                    .setCustomId(`admins_${Selected}_${botID}`)
                    .setTitle(Selected === "add" ? "Add Admin" : "Remove Admin");
                
                const userIdInput = new TextInputBuilder()
                    .setCustomId("id")
                    .setLabel("Enter User ID")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("User ID")
                    .setRequired(true);
                
                const actionRow = new ActionRowBuilder().addComponents(userIdInput);
                modal.addComponents(actionRow);
                
                await interaction.showModal(modal);
            }            else if (Selected === "adminslist") {
                let admins = AdminsDB.get(`Admins_${botID}`) || [];
                
                if (admins.length === 0) {
                    return interaction.reply({ content: "No admins found for this bot.", ephemeral: true });
                }

                const userListPromises = admins.map(async (adminID, index) => {
                    const user = await client.users.fetch(adminID).catch(() => ({ username: `${adminID}`, id: adminID }));
                    return `**${index + 1}.** \`${user.username} (${user.id})\``;
                });

                const userList = await Promise.all(userListPromises);

                const botClient = await client.users.fetch(botID).catch(() => ({ username: botID }));

                const embed = new EmbedBuilder()
                    .setColor("#ffffff")
                    .setDescription(`## ${botClient.username} Admins\n\n${userList.join("\n")}`);

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else if (Selected === "modifyadminpermissions") {
                await interaction.reply({ content: "This feature is currently under development.", ephemeral: true });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An unexpected error occurred. Please try again later.', ephemeral: true });
        }
    }
};