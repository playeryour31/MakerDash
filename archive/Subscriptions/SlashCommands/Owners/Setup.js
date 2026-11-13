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
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { ChannelType } = require("discord-api-types/v9");

const { Database } = require("st.db");
const BotMakerDB = new Database("./Database/BotMaker/Data.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Configure the bot maker system with necessary settings.")
        .addChannelOption(c => c
            .setName('sell-logs')
            .addChannelTypes(ChannelType.GuildText)
            .setDescription("Select the channel where sell logs will be recorded.")
            .setRequired(true)
        )
        .addChannelOption(c => c
            .setName('private-logs')
            .addChannelTypes(ChannelType.GuildText)
            .setDescription("Select the private logs channel.")
            .setRequired(true)
        )
        .addChannelOption(c => c
            .setName('command-room')
            .addChannelTypes(ChannelType.GuildText)
            .setDescription("Select the channel where bot commands will be used.")
            .setRequired(true)
        )
        .addRoleOption(c => c
            .setName('role')
            .setDescription("Select the role buyers will receive after purchasing.")
            .setRequired(true)
        )
        .addUserOption(u => u
            .setName('bank')
            .setDescription("Select the user representing the bank account.")
            .setRequired(true))
        .addUserOption(u => u
            .setName('probot')
            .setDescription("Select the ProBot bot to track transactions.")
            .setRequired(true)),
        
    botP: [PermissionsBitField.Flags.Administrator],
    P: "Administrator",
    ownerOnly: false,
    cooldown: 10000,
    async run(client, interaction, language, reply, embeds) {
        try {
            const sellLogs = interaction.options.getChannel('sell-logs').id;
            const privateLogs = interaction.options.getChannel('private-logs').id;
            const commandRoom = interaction.options.getChannel('command-room').id;
            const role = interaction.options.getRole('role').id;
            const bank = interaction.options.getUser('bank').id;
            const probot = interaction.options.getUser('probot').id;

            BotMakerDB.set(`BotMakerData_${client.user.id}_${interaction.guild.id}`, {
                sellLogs: sellLogs,
                privateLogs: privateLogs,
                commandRoom: commandRoom,
                role: role,
                bank: bank,
                probot: probot
            });

            const embed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayHexColor)
                .setDescription("## Bot Maker Setup Complete")
          		.setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ format: "png", dynamic: true, size: 128 }) })
                .addFields(
                    { name: "Sell Logs Channel", value: `<#${sellLogs}>`, inline: true },
                    { name: "Private Logs Channel", value: `<#${privateLogs}>`, inline: true },
                    { name: "Command Room", value: `<#${commandRoom}>`, inline: true },
                    { name: "Buyer Role", value: `<@&${role}>`, inline: true },
                    { name: "Bank Account", value: `<@${bank}>`, inline: true },
                    { name: "ProBot", value: `<@${probot}>`, inline: true }
                );

            interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            console.log(error)
            return interaction.editReply({ embeds: [embeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};