const {
    Client,
    Collection,
    Discord,
    createInvite,
    WebhookClient,
    PermissionsBitField,
    GatewayIntentBits,
    Partials,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    Events,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContextMenuCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder,
    ChatInputCommandInteraction
} = require("discord.js");

const { Database } = require("st.db");
const config = require("../../../Main/Resources/Config.json");
const moment = require('moment-timezone');
const Tokens = new Database("/Database/Others/Tokens.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const Lan = new Database("/Database/Others/Language.json");
const Prices = new Database("/Database/BotMaker/Prices.json");
const commandsData = require('../../../Main/Resources/Aliases.json'); 
let aliasesdb = new Database('/Database/Others/Aliases.json');
const Colors = require("../../../Main/Resources/Colors.json");
const OwnerDB = new Database("/Database/Others/OwnerData");
const BlacksDB = new Database("/Database/BotMaker/Blacklisted.json");
module.exports = {
    name: "otherss",
    description: "Handles select menu interactions for bot management.",
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
            const balanceSchema = require('../../../Schema/Balance');
            let log = "";
const userBots = (bots || []).filter(bot => bot.ClientID === botID);
const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
if (!isOwner) { 
    return interaction.reply({ 
        content: 'You do not have permission to manage this bot.', 
        ephemeral: true 
    });
}

            if (Selected === "voiceafk") {
                log = "Voice Afk";
                
                const OwnerModal = new ModalBuilder()
                    .setCustomId(`${botID}_voicePin`)
                    .setTitle("Keep the bot in a voice channel");

                const the_newOwnerID = new TextInputBuilder()
                    .setCustomId("voice")
                    .setRequired(true)
                    .setPlaceholder("Example: 123456789012345678")
                    .setLabel("Voice Channel ID")
                    .setStyle(TextInputStyle.Short);

                const NewOwnerID = new ActionRowBuilder().addComponents(the_newOwnerID);
                OwnerModal.addComponents(NewOwnerID);
                return await interaction.showModal(OwnerModal);

            } else if (Selected === "blacklist") {
                const action = interaction.values[0].split("_")[2].trim();
                log = action === "add" ? "Add Blacklist" : "Remove Blacklist";

                const modal = new ModalBuilder()
                    .setCustomId(`blacklist-handler_${action}_${botID}`)
                    .setTitle(action === "add" ? "Add users to blacklist" : "Remove users from blacklist");

                const userInput = new TextInputBuilder()
                    .setCustomId("user")
                    .setRequired(true)
                    .setLabel(`Enter the user ID to ${action}`)
                    .setStyle(TextInputStyle.Short);

                const userRow = new ActionRowBuilder().addComponents(userInput);
                modal.addComponents(userRow);
                return await interaction.showModal(modal); 
            
            } else if (Selected === "blacklistlist") {
                log = "Blacklist Show";

                let blacklistedUsers = BlacksDB.all().filter(entry => entry.ID.startsWith(`${botID}_`));

                if (blacklistedUsers.length === 0) {
                    return await interaction.followUp({ content: "No users are blacklisted for this bot.", ephemeral: true });
                }

                const userListPromises = blacklistedUsers.map(async (entry, index) => {
                    let userID = entry.ID.split("_")[1]; 
                    const user = await client.users.fetch(userID).catch(() => ({ username: `${userID}`, id: userID }));
                    return `**${index + 1}.** \`${user.username} (${user.id})\``;
                });

                const userList = await Promise.all(userListPromises);
                const Client = await client.users.fetch(botID).catch(() => ({ username: botID }));

                const me = new EmbedBuilder()
                    .setColor("#ffffff")
                    .setDescription(`## ${Client.username} Blacklisted Users\n\n${userList.join("\n")}`);

                return await interaction.reply({ embeds: [me], ephemeral: true });
            }

        } catch (error) {
            console.error(error);
            if (!interaction.replied) {
                await interaction.reply({ content: "An unexpected error occurred. Please try again later.", ephemeral: true });
            }
        }
    }
};
