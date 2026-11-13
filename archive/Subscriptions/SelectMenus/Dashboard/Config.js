const {
    Client,
    Collection,
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
    EmbedBuilder
} = require("discord.js");

const { Database } = require("st.db");
const config = require("../../../Main/Resources/Config.json");
const moment = require('moment-timezone');
const Tokens = new Database("/Database/Others/Tokens.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const Lan = new Database("/Database/Others/Language.json");
const RunDB = new Database("/Database/BotMaker/RunBots");
const Prices = new Database("./Subscriptions/Database/Others/Prices.json");
const commandsData = require('../../../Main/Resources/Aliases.json'); 
const aliasesdb = new Database('/Database/Others/Aliases.json');
const Colors = require("../../../Main/Resources/Colors.json");
const OwnerDB = new Database("/Database/Others/OwnerData");

module.exports = {
    name: "select-actions",
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
            const data = await BotMakerDB.get(`BotMakerData_${client.user.id}_${interaction.guild.id}`)
            const logChannel = await client.channels.cache.get(data.privateLogs);
   		    const adminChannel = logChannel;
            if (Selected === "status") {
                const BotStatus = interaction.values[0].split("_")[2].trim();  
                const user = interaction.member ? interaction.member.displayName : interaction.user.username;
                const TheBot = await client.users.fetch(botID).catch(() => ({ username: botID }));

                if (BotStatus === "Shutdown") { 
                    await RunDB.set(botID, false);
                    interaction.update({ 
                       embeds: [new EmbedBuilder().setDescription(`**${TheBot.username}** has been successfully shut down.`).setColor("#2DCC70")], 
                        ephemeral: false,
                    	components: []

                    });

                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setColor(interaction.guild.members.me?.displayColor)
                            .setDescription("Bot Shutdown")
                            .addFields(
                                { name: 'Bot:', value: `${TheBot.username || "Unknown"}`, inline: true },
                                { name: 'By:', value: `<@${interaction.user.id}>`, inline: true }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [embed] });
                    }
                } else { 
                    await RunDB.set(botID, true);
                    interaction.update({ 
                       embeds: [new EmbedBuilder().setDescription(`**${TheBot.username}** is now running.`).setColor("#2DCC70")], 
                        ephemeral: false,
                    	components: [] 
                    });

                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setColor(interaction.guild.members.me?.displayColor)
                            .setTitle("Bot Started")
                            .addFields(
                                { name: 'Bot:', value: `${TheBot.username || "Unknown"}`, inline: true },
                                { name: 'By:', value: `<@${interaction.user.id}>`, inline: true }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [embed] });
                    }
                }
            } 
            else if (Selected === "changeOwner") {
                const OwnerModal = new ModalBuilder()
                    .setCustomId(`${botID}_updateowner`)
                    .setTitle(`Change Bot Owner`);

                const the_newOwnerID = new TextInputBuilder()
                    .setCustomId('newownerid')
                    .setRequired(true)
                    .setPlaceholder(`Example: 123456789012345678`)
                    .setLabel("New Owner's ID")
                    .setStyle(TextInputStyle.Short);

                OwnerModal.addComponents(new ActionRowBuilder().addComponents(the_newOwnerID));
                await interaction.showModal(OwnerModal);
            } 
            else if (Selected === "changePrefix") {
                const OwnerModal = new ModalBuilder()
                    .setCustomId(`${botID}_changePrefix`)
                    .setTitle(`Change Bot Prefix`);

                const the_newPrefix = new TextInputBuilder()
                    .setCustomId('newPrefix')
                    .setRequired(true)
                    .setPlaceholder(`Example: !, ?, $`)
                    .setLabel("New Prefix")
                    .setStyle(TextInputStyle.Short);

                OwnerModal.addComponents(new ActionRowBuilder().addComponents(the_newPrefix));
                await interaction.showModal(OwnerModal);
            } 
            else if (Selected === "ChangeLanguage") {
            const balanceSchema = require('../../../Schema/Balance');

                const botLanguage = interaction.values[0].split("_")[2].trim();
                const userID = interaction.user.id;
                const lastLanguage = Lan.get(botID) || "Not Set";
                const TheBot = await client.users.fetch(botID).catch(() => botID);
            const ChangePrice = Prices.get(`LanguageP_${interaction.guild.id}_${client.user.id}`) || 1;
            const userdata = await balanceSchema.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
            const usercoins = userdata?.balance || 0;

            if (usercoins < ChangePrice) {
                return interaction.reply({
                    content: 'You do not have enough balance to proceed.',
                    ephemeral: true
                });
            }
              userdata.balance -= ChangePrice;
                await userdata.save();
                await Lan.set(botID, botLanguage);

                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(interaction.guild.members.me?.displayColor)
                        .setTitle("Bot Language Updated")
                        .addFields(
                            { name: 'Bot:', value: `${TheBot.username || "Unknown"}`, inline: true },
                            { name: 'New Language:', value: `${botLanguage === 'Ar' ? 'Arabic' : 'English'}`, inline: true },
                            { name: 'Previous Language:', value: lastLanguage, inline: true },
                            { name: 'User:', value: `<@${userID}>`, inline: true }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] });
                }

                await interaction.update({ 
                    embeds: [new EmbedBuilder().setDescription(`${TheBot.username || "Bot"} language has been updated to ${botLanguage === 'Ar' ? 'Arabic' : 'English'}.`).setColor(interaction.guild.members.me?.displayColor)], 
                    components: [],
                    ephemeral: false 
                });
             } else if (Selected === "admins") {
           const menu = new StringSelectMenuBuilder()
                    .setCustomId('admins-actions')
                    .setPlaceholder('Select an action for admins')
                    .addOptions(
                        {
                            label: 'Admins List', 
                            description: 'View all admins with specific privileges.',
                            value: `${botID}_adminslist`,
                			emoji: '<:List:1342283661319602347>'

                        },
                        {
                            label: 'Add Admin', 
                            description: 'Grant admin privileges to a specific role or user.',
                            value: `${botID}_add`,
                			emoji: '<:Add:1302245462887235667>'

                        },
                        {
                            label: 'Remove Admin', 
                            description: 'Remove admin privileges from a specific role or user.',
                            value: `${botID}_remove`,
                			emoji: '<:Remove:1293713971945144493>'

                        },
                        {
                            label: 'Modify Admin Permissions', 
                            description: 'Modify admin privileges for a specific role or user.',
                            value: `${botID}_modifyadminpermissions`,
                			emoji: '<:modify:1351987366172168243>'

                        }
                    );
                const row = new ActionRowBuilder().addComponents(menu);

                await interaction.update({
                    components: [row]
                });
             } else if (Selected === "renew") {
    const balanceSchema = require('../../../Schema/Balance');
    const RenewTime = 30;
    const maxRenewDays = 365;
    const bots = Tokens.get('Bots') || [];
    const bot = bots.find(bot => bot.ClientID === botID);

    if (!bot) return interaction.reply({ content: "Bot not found.", ephemeral: true });

    const Type = bot.Type;
    const RenewPrice = await Prices.get(`${Type}P_${interaction.guild.id}`) || bot.Price || 10000;
    const userdata = await balanceSchema.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
    const usercoins = userdata?.balance || 0;
    const currentEndTime = new Date(bot.endTime);
    const currentTime = new Date();
    const daysLeft = Math.floor((currentEndTime - currentTime) / (1000 * 60 * 60 * 24));
    const TheBot = await client.users.fetch(botID).catch(() => ({ username: botID }));
    if (usercoins < RenewPrice) {
        return interaction.reply({ content: `Not enough balance. Needed: ${RenewPrice}, You have: ${usercoins}.`, ephemeral: true });
    }

    userdata.balance -= RenewPrice;
    userdata.save().then(async () => {
        const newEndTime = new Date(currentEndTime);
        newEndTime.setDate(newEndTime.getDate() + RenewTime);
        const totalDays = Math.floor((newEndTime - currentTime) / (1000 * 60 * 60 * 24));

        if (totalDays > maxRenewDays) {
            return interaction.reply({ content: `Cannot renew beyond ${maxRenewDays} days.`, ephemeral: true });
        }

        bot.endTime = newEndTime.toISOString();
        Tokens.set('Bots', bots);

        const embed = new EmbedBuilder()
            .setTitle("Bot Renewed Successfully")
            .setColor(interaction.guild.members.me?.displayColor)
            .addFields(
                { name: 'Bot:', value: `${TheBot.username || "Unknown"}`, inline: true },
                { name: 'New Expiry:', value: `${newEndTime.toLocaleString()}`, inline: true },
                { name: 'Deducted:', value: `${RenewPrice} Coins`, inline: true },
                { name: 'Total Days Left:', value: `${totalDays} days`, inline: true }
            )
            .setTimestamp();

        if (adminChannel) await adminChannel.send({ embeds: [embed] });

        const ssssss = new EmbedBuilder()
            .setDescription(`**${TheBot.username || "Bot"} Renewed Successfully**`)
            .setColor(Colors.LighGreen);
        await interaction.update({ embeds: [ssssss], components: [] });
    });
}
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: 'An unexpected error occurred. Please try again later.', 
                ephemeral: true 
            });
        }
    }
};
