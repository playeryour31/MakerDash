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
const Colors = require("../../../Main/Resources/Colors.json");
const moment = require('moment-timezone');
const Tokens = new Database("/Database/Others/Tokens.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const Lan = new Database("/Database/Others/Language.json");
const OwnerDB = new Database("/Database/Others/OwnerData");

module.exports = {
    name: "select-bots",
    description: "",
    usage: [""],
    botPermission: [""],
    authorPermission: [""],
    cooldowns: [0],
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            let BotID = interaction.values[0];

            const bots = Tokens.get('Bots') || [];
const userBots = (bots || []).filter(bot => bot.ClientID === BotID);
const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
if (!isOwner) { 
    return interaction.reply({ 
        content: 'You do not have permission to manage this bot.', 
        ephemeral: true 
    });
}
            const userBota = bots.filter(bot => bot.ClientID === BotID);
            const bot = userBota[0];  

            const Type = bot.Type;   
            const Client = await client.users.fetch(bot.ClientID).catch(() => ({ username: `${bot.Type} #${bot.BotID}` }));

            const botEmbed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayColor)
                .setDescription(`## ${Client.username} Control Panel`)
    			.setThumbnail(Client.displayAvatarURL());
            const menu = new StringSelectMenuBuilder()
                .setCustomId('select-action')
                .setPlaceholder('Select an action for the bot')
                .addOptions([
                    {
                        label: 'Config Settings', 
                        description: "Bot settings: language, owner, admins, start/stop.",
                        value: `${BotID}_config`, 
                    },
                    {
                        label: 'Manage Commands', 
                        description: 'Manage aliases, roles, and channel access.',
                        value: `${BotID}_manage-commands`, 
                    },
                    {
                        label: 'Others', 
                        description: 'Voice AFK and blacklist control.',
                        value: `${BotID}_others`, 
                    }
                ]);

            const DashSelection = new ActionRowBuilder().addComponents(menu);

            await interaction.update({ embeds: [botEmbed], components: [DashSelection] });
        } catch (error) {
            console.log(error);
            await interaction.reply({ content: 'We are currently experiencing issues connecting to Discord. Please try again later.' });
        }
    }
};
