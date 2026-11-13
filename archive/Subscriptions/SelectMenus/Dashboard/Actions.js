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
const RunDB = new Database("/Database/BotMaker/RunBots");
const Lan = new Database("/Database/Others/Language.json");
const Prices = new Database("/Database/BotMaker/Prices.json");
const commandsData = require('../../../Main/Resources/Aliases.json'); 
let aliasesdb = new Database('/Database/Others/Aliases.json');
const OwnerDB = new Database("/Database/Others/OwnerData");

module.exports = {
    name: "select-action",
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
const userBots = (bots || []).filter(bot => bot.ClientID === botID);
const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
if (!isOwner) { 
    return interaction.reply({ 
        content: 'You do not have permission to manage this bot.', 
        ephemeral: true 
    });
}
          if (Selected === "config") {

            const Language = await Lan.get(botID);
            let emot;
            let lang;
            let ss;
            const Status = await RunDB.get(botID);
            let emott;
            let text;
            let desc;
            if (Status) {
 			desc = 'to Shutdown the bot';
 			text = 'Shutdown';
            } else { 
 			desc = 'to Run the bot';
         	text = 'Run';
          }
            if (Language === "Ar") {
                lang = "English";
                ss = "En";
            } else {
                lang = "Arabic";
                ss = "Ar";
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId('select-actions')
                .setPlaceholder('Select an action for the bot')
                .addOptions([
                    {
                        label: text, 
                        description: desc,
                        value: `${botID}_status_${text}`, 
                    },
                    {
                        label: 'Change Language', 
                        description: "Switch the bot to " + lang + " language.",
                        value: `${botID}_ChangeLanguage_${ss}`, 
                    },
                    {
                        label: 'Change Owner', 
                        description: 'Transfer ownership of the bot to another user.',
                        value: `${botID}_changeOwner`, 
                    },
                    {
                        label: 'Change Prefix', 
                        description: 'change the bot prefix.',
                        value: `${botID}_changePrefix`, 
                    },
                    {
                        label: 'Add Days', 
                        description: 'Renew the bot or add extra days to its duration.',
                        value: `${botID}_renew`, 
                    },
					{
    					label: 'Admins', 
   						description: 'Add, remove, or display bot admins.', 
    					value: `${botID}_admins`, 
					}

                ]);


            const DashSelection = new ActionRowBuilder().addComponents(menu);

            await interaction.update({  components: [DashSelection] });

  } else if (Selected === "manage-commands") {
           const menu = new StringSelectMenuBuilder()
                .setCustomId('manage-commands')
                .setPlaceholder('Select an action for the commands')
                .addOptions([
     {
    label: 'Add Aliases', 
    description: 'You can add an alias for each command.',
    value: `${botID}_addaliases`, 

},
{
    label: 'Remove Aliases', 
    description: 'Remove your shortcuts/aliases from your bot commands.',
    value: `${botID}_renaliases`, 

},
{
    label: 'Aliases List', 
    description: 'Show all your shortcuts/aliases from your bot commands.',
    value: `${botID}_all`, 

}

                ]);


            const DashSelection = new ActionRowBuilder().addComponents(menu)
            await interaction.update({ components: [DashSelection] });
  
   } else if (Selected === "others") {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('otherss')
        .setPlaceholder('Select an action')
        .addOptions([
            {
                label: 'Voice AFK', 
                description: 'Set up an AFK voice channel for inactive users.',
                value: `${botID}_voiceafk`, 
        
            },
            {
                label: 'Add to Blacklist', 
                description: 'Block a user or channel from using bot commands.',
                value: `${botID}_blacklist_add`, 
            },
            {
                label: 'Remove from Blacklist', 
                description: 'Unblock a user or channel from the blacklist.',
                value: `${botID}_blacklist_remove`, 
             
            },
            {
                label: 'Blacklist List', 
                description: 'View all users and channels in the blacklist.',
                value: `${botID}_blacklistlist`, 
            
            }
        ]);
            const DashSelection = new ActionRowBuilder().addComponents(menu);

            await interaction.update({  components: [DashSelection] });


} else if (Selected === "permissions") {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('permissions')
        .setPlaceholder('Select an action for permissions')
        .addOptions([
            {
                label: 'Add Permissions', 
                description: 'Grant specific roles or users access to bot commands.',
                value: `${botID}_addpermissions`, 
                // emoji: '<:Add:1302245462887235667>'
            },
            {
                label: 'Remove Permissions', 
                description: 'Revoke command access from specific roles or users.',
                value: `${botID}_removepermissions`, 
                // emoji: '<:Remove:1293713971945144493>'
            },
            {
                label: 'Permissions List', 
                description: 'View all roles and users with special permissions.',
                value: `${botID}_permissionslist`, 
                // emoji: '<:List:1342283661319602347>'
            }
        ]);
}

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An unexpected error occurred. Please try again later.', ephemeral: true });
        }
    }
};
