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

const { Database } = require("st.db");
const db = require("../../lib/featureDb")("offer");


module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-offer')
        .setDescription('setup the offer system.')
.addChannelOption(option =>
            option.setName('offers-channel')
                .setDescription('The channel where offers will be posted.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('offers-log')
                .setDescription('The log channel for offer-related actions.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('offer-transcript')
                .setDescription('Enable or disable offer transcript.')
                .addChoices(
                    { name: 'On', value: 'on' },
                    { name: 'Off', value: 'off' }
                )
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('offer-role')
                .setDescription('The role to assign for managing offers.')
                .setRequired(true)),

    type: "Offer",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: true,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const offersChannel = interaction.options.getChannel('offers-channel');
            const offersLog = interaction.options.getChannel('offers-log');
            const offerTranscript = interaction.options.getString('offer-transcript');
            const offerRole = interaction.options.getRole('offer-role');


            db.set("OfferData_" + client.user.id + "_" + interaction.guild.id, {
            offersChannel: offersChannel.id,
            offersLog: offersLog.id,
            offerTranscript: offerTranscript,
            offerRole: offerRole.id
        });

        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle(reply.Offer.Embeds.Setup.Title)
            .addFields(
                { name: `${reply.Offer.Embeds.Setup.Fields.OffersChannel}`, value: `<#${offersChannel.id}>`, inline: true },
                { name: `${reply.Offer.Embeds.Setup.Fields.OffersLog}`, value: `<#${offersLog.id}>`, inline: true },
                { name: `${reply.Offer.Embeds.Setup.Fields.OfferTranscript}`, value: offerTranscript, inline: true },
                { name:`${reply.Offer.Embeds.Setup.Fields.OfferRole}`, value: `<@&${offerRole.id}>`, inline: true }
            )
            .setFooter({ text: reply.Offer.Embeds.Setup.Footer })
            .setTimestamp();

  await interaction.reply({
            embeds: [embed],
            ephemeral: false
        });

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};