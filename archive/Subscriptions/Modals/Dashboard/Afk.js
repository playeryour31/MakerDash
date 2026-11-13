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
const VoicesDB = new Database("/Database/Others/Voices.json");
const config = require("../../../Main/Resources/Config.json");
const Colors = require("../../../Main/Resources/Colors.json");

module.exports = {
    name: "voicePin",
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            let id = interaction.customId.split("_")[0]?.trim();
            let voice = interaction.fields.getTextInputValue("voice");
            const Balance = require('../../../Schema/Balance');
            let userdata = await Balance.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
            let usercoins = userdata?.balance || 0;
                let price = Prices.get(`AfkP_${interaction.guild.id}_${client.user.id}`) || 10;
                if (usercoins < price) {
                    return interaction.reply({ 
                        content: `Your balance is insufficient. The cost to add a new channel is ${price} coins.`, 
                        ephemeral: true 
                    });
                }
            if (isNaN(voice)) {
                return interaction.reply({ content: `**Invalid User ID!**\nExample: \`941085346886717480\``, ephemeral: true });
            }
                userdata.balance -= price;
                await Balance.updateOne(
                    { userid: interaction.user.id, guild: interaction.guild.id },
                    { balance: userdata.balance }
                );

VoicesDB.set(`${id}`, {
    VoiceChannel: voice
});

                return interaction.update({ embeds: [new EmbedBuilder().setDescription(`**Done save the channel successfully.**`).setColor(interaction.guild.members.me?.displayColor)], ephemeral: false });

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: `**An error occurred while processing. Please try again later.**`, ephemeral: true });
        }
    }
};
