const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActivityType
} = require("discord.js");
const { Database } = require("st.db");
const PricesDB = new Database("./Subscriptions/Database/Others/Prices.json");
const StatusDB = new Database('./Subscriptions/Database/Others/Status');
const fetch = require('node-fetch').default;
const bots = require("../../../Main/Resources/Bots.json");
const boter = new Database("./Main/Resources/Bots.json");

const botOptions = Object.values(bots)
    .filter(bot => bot.type)
    .map(bot => ({
        name: bot.name,
        value: bot.type
    }));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('change')
        .setDescription('Manage your bot settings')
        .addSubcommand(subcommand => 
            subcommand.setName('avatar')
        .setDescription("Change the bot's avatar")
        .addAttachmentOption(option => option
            .setName('image')
            .setDescription('Upload the new avatar image')
            .setRequired(true))
        )
        .addSubcommand(subcommand => 
            subcommand.setName('name')
        .setDescription("Change the bot's username")
        .addStringOption(option => option
            .setName('name')
            .setDescription('Enter the new username')
            .setMaxLength(32)
            .setRequired(true)))
        .addSubcommand(subcommand => 
            subcommand.setName('status')
        .setDescription("Change the bot's status")
        .addStringOption(option => option
            .setName('status')
            .setDescription('Enter the status message')
            .setMaxLength(32)
            .setRequired(true))
        .addStringOption(option => option
            .setName('type')
            .setDescription('Select the status type')
            .addChoices(
                { name: 'Playing', value: 'PLAYING' },
                { name: 'Listening', value: 'LISTENING' },
                { name: 'Watching', value: 'WATCHING' },
                { name: 'Competing', value: 'COMPETING' }
            )
            .setRequired(true)))
        .addSubcommand(subcommand => 
            subcommand.setName('price')
        .setDescription('Set the price for a specific configuration')
        .addStringOption(option => option
            .setName('type')
            .setDescription('Select the type of price to update')
            .setRequired(true)
.addChoices(
    ...botOptions,
    { name: 'Coins', value: 'Coins' },
    { name: 'Voice AFK', value: 'Afk' },
    { name: 'Admins', value: 'Admins' },
    { name: 'Aliases', value: 'Aliases' },
    { name: 'Language', value: 'Language' },
    { name: 'Owner', value: 'Owner' },
    { name: 'Prefix', value: 'Prefix' }
))

        .addIntegerOption(option => option
            .setName('price')
            .setDescription('Enter the new price')
            .setRequired(true))
        ),

    botP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: true,
    cooldown: 20000,
    
    async run(client, interaction, language, reply, embeds) {
        try {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'avatar') {
                const image = interaction.options.getAttachment('image');
                const response = await fetch(image.url);
                const buffer = await response.buffer();
                await client.user.setAvatar(buffer);
                return interaction.reply({ content: "Avatar updated successfully.", ephemeral: false });
            }
            
            if (subcommand === 'name') {
                const name = interaction.options.getString('name');
                await client.user.setUsername(name);
                return interaction.reply({ content: `Username changed to: ${name}.`, ephemeral: false });
            }
            
            if (subcommand === 'status') {
                const status = interaction.options.getString('status');
                const type = interaction.options.getString('type');
                
                client.user.setPresence({
                    activities: [{ name: status, type: ActivityType[type] }],
                    status: "online"
                });
                
                await StatusDB.set(client.user.id, { Name: status, Type: type });
                return interaction.reply({ content: `Status updated to: ${status}.`, ephemeral: false });
            }
            
            if (subcommand === 'price') {
                const type = interaction.options.getString('type');
                const price = interaction.options.getInteger('price');
                const bot = boter.get(type)
                await PricesDB.set(`${type}P_${interaction.guild.id}_${client.user.id}`, price);
                return interaction.reply({ content: `Price for ${bot?.type || type} updated to: ${price}.`, ephemeral: true });
            }
       } catch (error) {
            console.log(error)
            return interaction.editReply({ embeds: [embeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};