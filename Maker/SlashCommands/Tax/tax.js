const {
    Client,
    Collection,
    Discord,
    createInvite,
    ChannelType,
    WebhookClient,
    PermissionFlagsBits,
    GatewayIntentBits,
    Partials,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    Events,
    Message,
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
    PermissionOverwriteManager,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction
} = require("discord.js");


module.exports = {
    data: new SlashCommandBuilder()
        .setName('tax')
        .setDescription('Tax calculation.')
        .addStringOption(line => line
            .setName("number")
            .setDescription("The number.")
            .setRequired(true)
        )
    ,
    type: "Tax",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let number = interaction.options.getString("number")

            if (number.endsWith("m")) number = number.replace(/m/gi, "") * 1000000;
            else if (number.endsWith("k")) number = number.replace(/k/gi, "") * 1000;
            else if (number.endsWith("K")) number = number.replace(/K/gi, "") * 1000;
            else if (number.endsWith("M")) number = number.replace(/M/gi, "") * 1000000;
            else if (number.endsWith("B")) number = number.replace(/B/gi, "") * 1000000000;
            else if (number.endsWith("b")) number = number.replace(/b/gi, "") * 1000000000;
            else if (number.endsWith("T")) number = number.replace(/T/gi, "") * 1000000000000;
            else if (number.endsWith("t")) number = number.replace(/t/gi, "") * 1000000000000;
        
            let args2 = parseInt(number)
            let tax = Math.floor(args2 * (20) / (19) + (1))
            interaction.reply({ content: `> ${tax}`, allowedMentions: { repliedUser: false } })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};