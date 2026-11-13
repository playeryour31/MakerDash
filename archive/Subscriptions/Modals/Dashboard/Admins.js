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
    ChatInputCommandInteraction
} = require("discord.js");

const moment = require('moment-timezone');
moment.tz.setDefault('Africa/Cairo');

const { Database } = require("st.db");
const aliasesdb = new Database('/Database/Others/Aliases.json');
const Tokens = new Database("/Database/Others/Tokens.json");
const Prices = new Database("./Subscriptions/Database/Others/Prices.json");
const AdminsDB = new Database("/Database/BotMaker/Admins.json"); 
const coinsDB = new Database("/Database/BotMaker/Balance.json");
const config = require("../../../Main/Resources/Config.json");
const Colors = require("../../../Main/Resources/Colors.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");

module.exports = {
    name: "admins",
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            let id = interaction.customId.split("_")[2]?.trim();
            let action = interaction.customId.split("_")[1]?.trim();
            let adminID = interaction.fields.getTextInputValue("id").trim();
            let TheBot = await client.users.fetch(id).catch(() => id);
            let bots = Tokens.get('Bots') || [];
            let userBots = bots.filter(bot => bot.ClientID === id);

            const Balance = require('../../../Schema/Balance');
            let userdata = await Balance.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
            let usercoins = userdata?.balance || 0;
            const data = await BotMakerDB.get(`BotMakerData_${client.user.id}_${interaction.guild.id}`)
			const logss = data.privateLogs
            const logChannel = await client.channels.cache.get(logss);


            if (action === "add") {
                let price = Prices.get(`AdminsP_${interaction.guild.id}_${client.user.id}`) || 10;
                if (usercoins < price) {
                    return interaction.reply({ 
                        content: `Your balance is insufficient. The cost to add a new admin is ${price} coins.`, 
                        ephemeral: true 
                    });
                }

                let admins = AdminsDB.get(`Admins_${id}`) || [];
                if (admins.includes(adminID)) {
                    return interaction.reply({ 
                        content: `This user is already an admin for this bot.`, 
                        ephemeral: true 
                    });
                }

                admins.push(adminID);
                AdminsDB.set(`Admins_${id}`, admins);

                userdata.balance -= price;
                await Balance.updateOne(
                    { userid: interaction.user.id, guild: interaction.guild.id },
                    { balance: userdata.balance }
                );
                interaction.update({ 
                    embeds: [new EmbedBuilder().setDescription(`Successfully added <@${adminID}>  as an admin for ${TheBot.username}.`).setColor(interaction.guild.members.me?.displayColor)], 
                    ephemeral: false 
                });
                const logEmbed = new EmbedBuilder()
                    .setTitle("Admin Added")
                    .addFields(
                        { name: "User", value: `${interaction.user}, (${interaction.user.id})`, inline: true },
                        { name: "Bot", value: `${TheBot.username}, (${TheBot.id})`, inline: true },
                        { name: "New Admin", value: `<@${adminID}>`, inline: true },
                        { name: "Time", value: `${moment().format('YYYY-MM-DD HH:mm:ss')}`, inline: true }
                    )
                	.setTimestamp()
                    .setColor(Colors.LighGreen);

                if (logChannel) logChannel?.send({ embeds: [logEmbed] });

            } else if (action === "remove") {
                let admins = AdminsDB.get(`Admins_${id}`) || [];
                if (!admins.includes(adminID)) {
                    return interaction.reply({ 
                        content: `This user is not an admin for this bot.`, 
                        ephemeral: true 
                    });
                }

                admins = admins.filter(admin => admin !== adminID);
                AdminsDB.set(`Admins_${id}`, admins);

                interaction.update({ 
                    embeds: [new EmbedBuilder().setDescription(`Successfully removed <@${adminID}> from the admin list of ${TheBot.username}.`).setColor(interaction.guild.members.me?.displayColor)], 
                    ephemeral: false 
                });

                const logEmbed = new EmbedBuilder()
                    .setTitle("Admin Removed")
                    .addFields(
                        { name: "User", value: `${interaction.user}, (${interaction.user.id})`, inline: true },
                        { name: "Bot", value: `${TheBot.username}, (${TheBot.id})`, inline: true },
                        { name: "Removed Admin", value: `<@${adminID}>`, inline: true }
                    )
					.setTimestamp()
                    .setColor(Colors.RedWarn);

                  if (logChannel) logChannel?.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error(error);
            interaction.reply({ 
                content: `An error occurred while processing your request. Please try again later.`, 
                ephemeral: true 
            });
        }
    }
};
