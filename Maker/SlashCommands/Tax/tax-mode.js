const {
    Client,
    Collection,
    Discord,
    createInvite,
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
const { ChannelType } = require("discord-api-types/v9");
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("tax")


module.exports = {
    data: new SlashCommandBuilder()
        .setName('tax-mode')
        .setDescription('Change taxes mode.')

        .addStringOption(option => option
            .setName('color')
            .setDescription('Set the button color (Primary, Secondary, Success, Danger).')
            .setRequired(true)
            .addChoices(
                { name: 'Blue', value: ButtonStyle.Primary.toString() },
                { name: 'Gray', value: ButtonStyle.Secondary.toString() },
                { name: 'Green', value: ButtonStyle.Success.toString() },
                { name: 'Red', value: ButtonStyle.Danger.toString() }
            )
        )

        .addStringOption(option => option
            .setName('name')
            .setDescription('Set the button label name.')
            .setRequired(true)
        )


        .addStringOption(type => type
            .setName("mode")
            .setDescription("Pick the mode.")
            .setRequired(true)
            .addChoices(
                {name: "Message", value: "message"},
                {name: "Embed", value: "embed"},
            )
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
        const color = interaction.options.getString('color');
        const buttonName = interaction.options.getString('name');
        const mode = interaction.options.getString('mode');
		console.log(`${interaction.guild.id}\n${client.user.id}\n`)
        await db.set(`TaxButton_${interaction.guild.id}_${client.user.id}`, {
            color: color,  
            name: buttonName
        });

        await db.set(`taxType_${interaction.guild.id}_${client.user.id}`, mode);

        console.log("Button data saved successfully.");
        
        const savedData = await db.get(`TaxButton_${interaction.guild.id}_${client.user.id}`);
        const savedMode = await db.get(`taxType_${interaction.guild.id}_${client.user.id}`);

       // console.log("Saved button data:", savedData);
        //console.log("Saved Mode data:", savedMode);

        return interaction.reply({
            content: reply.Tax.Reply8,
            allowedMentions: { repliedUser: false }
        });
    } catch (error) {
        console.log(error);
        return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
    }
},
};