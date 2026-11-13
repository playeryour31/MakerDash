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
const Prices = new Database("./Subscriptions/Database/Others/Prices.json");
const coinsDB = new Database("/Database/BotMaker/Balance.json");
const config = require("../../../Main/Resources/Config.json");
const Colors = require("../../../Main/Resources/Colors.json");

module.exports = {
    name: "modal-aliases",
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            let command = interaction.customId.split("_")[1]?.trim();
            let id = interaction.customId.split("_")[2]?.trim();
            let action = interaction.customId.split("_")[3]?.trim();
            let aliase = interaction.fields.getTextInputValue("aliase");
            let TheBot = client.users.fetch(id).catch(() => id);
            let bots = Tokens.get('Bots') || [];
            let userBots = bots.filter(bot => bot.ClientID === id);

            const balanceSchema = require('../../../Schema/Balance');
            let usercoins = 0;
            let userdata = await balanceSchema.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
            usercoins = userdata?.balance || 0;

            if (action == "add") {
                let price = Prices.get(`AliasesP_${interaction.guild.id}`) || 1;
                if (usercoins < price) 
                    return interaction.reply({ content: `Your balance is insufficient. The price to add a new alias is ${price}.`, ephemeral: true });

                let check = aliasesdb.get(`${aliase}_${id}`) || null;
                if (aliase == command) 
                    return interaction.reply({ content: `Your bot already has this alias for the selected command.` });
                userdata.balance -= price;
                await balanceSchema.updateOne(
                    { userid: interaction.user.id, guild: interaction.guild.id },
                    { balance: userdata.balance }
                );

					aliasesdb.set(`${aliase}_${id}`, command).then(() => {
                    interaction.update({ content: `The alias '${aliase}' has been successfully added.`, components: [], ephemeral: true });

                    const logEmbed = new EmbedBuilder()
                        .setTitle("Alias Added")
                        .addFields(
                            { name: "User", value: `${interaction.user}, (${interaction.user.id})`, inline: true },
                            { name: "Bot", value: `${TheBot.username}, (${TheBot.id})`, inline: true },
                            { name: "Command", value: `${command}`, inline: true },
                            { name: "Alias", value: `${aliase}`, inline: true }
                        )	.setTimestamp()

                        .setColor(Colors.LighGreen);
            const data = BotMakerDB.get(`BotMakerData_${client.user.id}_${interaction.guild.id}`)
			const logss = data.privateLogs
            const logChannel = client.channels.cache.get(logss);
                    logChannel?.send({ embeds: [logEmbed] });
                });
            } else if (action == "remove") {
                let check = aliasesdb.get(`${aliase}_${id}`) || null;
                if (check != command) 
                    return interaction.update({ content: `No aliases found for the selected command.`, components: [], ephemeral: true });
                
                aliasesdb.delete(`${aliase}_${id}`).then(() => {
                    interaction.update({ content: `The alias '${aliase}' has been successfully removed.`, components: [], ephemeral: true });

                    const logEmbed = new EmbedBuilder()
                        .setTitle("Alias Removed")
                        .addFields(
                            { name: "User", value: `${interaction.user}, (${interaction.user.id})`, inline: true },
                            { name: "Bot", value: `${TheBot.username}, (${TheBot.id})`, inline: true },
                            { name: "Command", value: `${command}`, inline: true },
                            { name: "Alias", value: `${aliase}`, inline: true },
                        )	.setTimestamp()

                        .setColor(Colors.RedWarn);

            const data = BotMakerDB.get(`BotMakerData_${client.user.id}_${interaction.guild.id}`)
			const logss = data.privateLogs
            const logChannel = client.channels.cache.get(logss);
                    logChannel?.send({ embeds: [logEmbed] });
                });
            }
        } catch (error) {
            console.error(error);
            interaction.reply({ content: `An error occurred while processing. Please try again later.`, ephemeral: true });
        }
    }
};
