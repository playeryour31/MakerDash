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
} = require("discord.js");
module.exports = {
    name: "resendbot",
    ownerOnly: false,
    run: async (client, interaction, args, config) => {
        try {
            const userid = interaction.customId.split("_")[1].trim();
            let user = await interaction.guild.members.fetch(userid).catch(() => null);
            if (!user) {
                user = await client.users.fetch(userid).catch(() => null);
                if (!user) {
                    return interaction.reply({ content: `I can't find the user in the guild or as a user`, ephemeral: true });
                }
            }
            const invite_Button = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(`${interaction.message.components[0].components[0].url}`)
                    .setLabel(`${interaction.message.components[0].components[0].label}`)
                    .setDisabled(false)
               
            ]);
            try {
                if (user.send) {
                    await user.send({ embeds: [interaction.message.embeds[1]], components: [invite_Button] });
                    return interaction.reply({ content: `The invoice has been successfully sent to the user`, ephemeral: true });
                } else {
                    return interaction.reply({ content: `I couldn't send the message to the user, they might have DMs disabled`, ephemeral: true });
                }
            } catch (sendError) {
                console.error(sendError);
                return interaction.reply({ content: `I couldn't send the message to the user due to an error`, ephemeral: true });
            }

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: `An error occurred while processing your request`, ephemeral: true });
        }
    }
};
