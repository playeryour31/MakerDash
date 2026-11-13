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

const config = require('../../Resources/Config.json');


module.exports = {
    name: "err_modal-bot",
    ownerOnly: false,
    /**
    * 
    * @param {ChatInputCommandInteraction} interaction 
    */
    run: async (client, interaction) => {
        try {
            const errID = interaction.fields.getTextInputValue('errid');
            const ErCH = config.LogChannels.ErrReportsLog;
            const channel = await client.channels.fetch(ErCH);
            const errorData = errorDB.get(errID); 
            const userMention = interaction.user.toString(); 
     if (isNaN(errID) || errID.trim() === "") {
                return await interaction.reply({ 
                    content: `The input must be a valid number. Please enter a valid error number.`, 
                    ephemeral: true 
                });
            }
            if (!errorData) {
                const NoErr = new EmbedBuilder()
                    .setColor('#ff0000') 
                    .setTitle(`Error: Invalid Error Number `)
                    .setDescription(`There is no error with the number: **${errID}**. By ${userMention} Please check the entered number.`)
                    .setTimestamp();

                if (channel) {
                    await channel.send({ embeds: [NoErr] });
                }

                return await interaction.reply({ content: `The error number: **${errID}** does not exist.`, ephemeral: true });
            }

            const Err = new EmbedBuilder()
                .setColor('#ff0000') 
                .setTitle(`Error Details for ID: ${errID}`)
                .setDescription(`**Error:** ${errorData.Err || "N/A"}`)
                .addFields([
                    { name: 'User', value: `${interaction.user.id}, ${interaction.user.tag}`},
                    { name: 'Message', value: errorData.message || "N/A" },
                    { name: 'Count', value: errorData.count.toString() }
                ])
                .setTimestamp();

            if (channel) {
                await channel.send({ embeds: [Err] });
            }

            await interaction.reply({ content: `We will resolve the issue related to error number: ${errID} shortly.`, ephemeral: true });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An error occurred while processing the form. Please try again later.', ephemeral: true });
        }
    }
}
