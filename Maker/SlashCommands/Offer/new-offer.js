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
        .setName('new-offer')
        .setDescription('make a new Offer.')
        .addStringOption(option =>
            option.setName('offer-type')
                .setDescription('select the offer type.')
                .addChoices(
                    { name: 'Message', value: 'message' },
                    { name: 'Embed', value: 'embed' }
                )
                .setRequired(true))
        .addStringOption(option =>
            option.setName('offer-message')
                .setDescription('The message to assign for sending in offer channel.')
                .setRequired(true))
   .addStringOption(option =>
              option.setName('offer-name')
                .setDescription('The name that will sending with offer tickets.'))
   .addStringOption(option =>
            option.setName('mention')
                .setDescription('Enable or disable offer transcript.')
                .addChoices(
                    { name: 'everyone', value: 'everyone' },
                    { name: 'here', value: 'here' }
                )),

    type: "Offer",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
             const offerType = interaction.options.getString('offer-type');
            const offerMessage = interaction.options.getString('offer-message');
            const offerName = interaction.options.getString('offer-name') || 'No Offer Name';
            const mentionType = interaction.options.getString('mention');
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

            let style;
            if (mentionType === 'everyone') {
                style = '@everyone'; 
            } else {
                style = '@here'; 
            }


const role = interaction.guild.roles.cache.get(OfferSystem.offerRole); 
const hasRole = interaction.member.roles.cache.has(role.id); 

if (!hasRole) {
    return interaction.reply({ content: reply.Offer.Reply5.replace("[ROLE]", role.name), ephemeral: true });
}
        let offerCount = db.get(`OfferCount_${interaction.guild.id}`) || 0;
            offerCount += 1;

            db.set(`OfferCount_${interaction.guild.id}`, offerCount);

            const button = new ButtonBuilder()
                .setCustomId(`offerbutton_${offerCount}`)
                .setLabel(ButtonSystem.ButtonLabel)
                .setStyle(ButtonSystem.ButtonStyle);


            let messageContent = `${offerMessage}\n${style}`;
            const channel = await client.channels.fetch(OfferSystem.offersChannel);
            if (!channel) {
                return interaction.reply({ content: reply.Offer.Reply2, ephemeral: true });
            }

            let mm;
            if (offerType === 'message') {
                mm = await channel.send({ content: messageContent, components: [new ActionRowBuilder().addComponents(button)] });
            } else if (offerType === 'embed') {
                const embed = new EmbedBuilder()
                    .setDescription(`${offerMessage}`)
                    .setColor(interaction.guild.members.me.displayHexColor);

                mm = await channel.send({ embeds: [embed], content: `${style}`, components: [new ActionRowBuilder().addComponents(button)] });
            }




 db.set("NewOffer_" + offerCount + "_" + client.user.id + "_" + interaction.guild.id, {
            MessageID: mm.id,
            CareteBy: interaction.user.id,
            GuildID: interaction.guild.id,
            MentionType: style,
            OfferText: offerMessage,
            Name: offerName,
            OfferType: offerType,
            OfferCount: offerCount 

        });

            return interaction.reply({ content: reply.Offer.Reply3, ephemeral: true });

        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};