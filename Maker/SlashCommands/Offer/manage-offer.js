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
        .setName('manage-offer')
        .setDescription('Manage offers by disabling buttons or deleting offers.')
        .addStringOption(option =>
            option.setName('message-id')
                .setDescription('The ID of the offer message.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('offer-action')
                .setDescription('Choose whether to close (disable buttons) or delete the offer.')
                .addChoices(
                    { name: 'Delete', value: 'delete' },
                    { name: 'Close', value: 'close' }
                )
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
            const messageId = interaction.options.getString('message-id');
            const offerAction = interaction.options.getString('offer-action');
            const FirstDB = db.get("OfferData_" + client.user.id + "_" + interaction.guild.id) || null;
            const SecendDB = db.get("OfferticketSetupData_" + client.user.id + "_" + interaction.guild.id) || null;

            if (!FirstDB) return interaction.reply({ content: reply.Offer.Reply4, ephemeral: true, allowedMentions: { repliedUser: false } });
            if (!SecendDB) return interaction.reply({ content: reply.Offer.Reply4, ephemeral: true, allowedMentions: { repliedUser: false } });

            const ButtonSystem = {
                "ButtonLabel": SecendDB.button_name,
                "ButtonStyle": SecendDB.button_color
            };

            const OfferSystem = {
                "offersChannel": FirstDB.offersChannel,
                "offerRole": FirstDB.offerRole
            };

                             
const role = interaction.guild.roles.cache.get(OfferSystem.offerRole); 
const hasRole = interaction.member.roles.cache.has(role.id); 

if (!hasRole) {
    return interaction.reply({ content: reply.Offer.Reply5.replace("[ROLE]", role.name), ephemeral: true });
}
                        let channel = client.channels.cache.get(OfferSystem.offersChannel);
            if (!channel) {
                return interaction.reply({ content: reply.Offer.Reply9, ephemeral: true });
            }

            let message;
            try {
                message = await channel.messages.fetch(messageId);
            } catch (error) {
                return interaction.reply({ content: reply.Offer.Reply6, ephemeral: true });
            }

            if (offerAction === 'close') {
                const components = message.components.map(row => {
                    return new ActionRowBuilder().addComponents(
                        row.components.map(component => 
                            ButtonBuilder.from(component).setDisabled(true)
                        )
                    );
                });

                await message.edit({ components });
                return interaction.reply({ content: reply.Offer.Reply7, ephemeral: true });

            } else if (offerAction === 'delete') {
                await message.delete();
                return interaction.reply({ content: reply.Offer.Reply8, ephemeral: true });
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};