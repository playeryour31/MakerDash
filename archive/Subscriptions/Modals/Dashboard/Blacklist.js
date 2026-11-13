const {
    Client,
    Collection,
    Discord,
    createInvite,
    ChannelType,
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
    SlashCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    Embed,
    ChatInputCommandInteraction
} = require("discord.js");

const moment = require('moment-timezone');
moment.tz.setDefault('Africa/Cairo');

const { Database } = require("st.db");
const aliasesdb = new Database('/Database/Others/Aliases.json');
const Tokens = new Database("/Database/Others/Tokens.json");
const Prices = new Database("/Database/BotMaker/Prices.json");
const coinsDB = new Database("/Database/BotMaker/Balance.json");
const BlacksDB = new Database("/Database/BotMaker/Blacklisted.json");
const config = require("../../../Main/Resources/Config.json");
const Colors = require("../../../Main/Resources/Colors.json");

module.exports = {
    name: "blacklist-handler",
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            let id = interaction.customId.split("_")[2]?.trim();
            let action = interaction.customId.split("_")[1]?.trim();
            let user = interaction.fields.getTextInputValue("user");

            if (isNaN(user)) {
                return interaction.reply({ content: `**Invalid User ID!**\nExample: \`941085346886717480\``, ephemeral: true });
            }

            let TheBot = await client.users.fetch(id).catch(() => id);
            let bots = Tokens.get('Bots') || [];
            let userBots = bots.filter(bot => bot.ClientID === id);

            if (action === "add") {
                if (BlacksDB.get(`${id}_${user}`)) { 
                    return interaction.reply({ content: `**This user is already blacklisted!**`, ephemeral: true });
                }

                BlacksDB.set(`${id}_${user}`, true);
                return interaction.reply({ content: `**User has been blacklisted successfully.**`, ephemeral: true });

            } else if (action === "remove") {
                if (!BlacksDB.get(`${id}_${user}`)) { 
                    return interaction.reply({ content: `**This user is not blacklisted!**`, ephemeral: true });
                }

                BlacksDB.delete(`${id}_${user}`);
                return interaction.reply({ content: `**User has been removed from the blacklist.**`, ephemeral: true });
            }

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: `**An error occurred while processing. Please try again later.**`, ephemeral: true });
        }
    }
};
