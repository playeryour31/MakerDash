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
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
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
    RoleSelectMenuBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("offer")

module.exports = {
    name: "offerbutton",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
         try {
            let CountsDB = interaction.customId.split("_")[1].trim();
            const FirstDB = db.get("OfferData_" + client.user.id + "_" + interaction.guild.id) || null;
            const SecendDB = db.get("OfferticketSetupData_" + client.user.id + "_" + interaction.guild.id) || null;
            const OfferDB = db.get("NewOffer_" + CountsDB + "_" + client.user.id + "_" + interaction.guild.id) || null;
 
            if (!FirstDB) {
                return interaction.reply({ content: reply.Offer.Reply4, ephemeral: true, allowedMentions: { repliedUser: false } });
            }
            if (!SecendDB) {
                return interaction.reply({ content: reply.Offer.Reply4, ephemeral: true, allowedMentions: { repliedUser: false } });
            }
            if (!OfferDB) {
                return interaction.reply({ content: reply.Offer.Reply10, ephemeral: true });
            }
        const status = await db.get(`alreadyCreated_${interaction.user.id}_${interaction.guild.id}`) || false;
        if (status === true) {
        return interaction.reply({ content: reply.Offer.Reply12, ephemeral: true });
            }
            const panal_categoryID = SecendDB.panal_categoryID;
            const roleid = SecendDB.support_role;
            const roleid1 = FirstDB.offerRole;
            const CareteBy = interaction.guild.members.cache.get(OfferDB.CareteBy);

            const embed = new EmbedBuilder()
                .setColor(interaction.guild.members.me.displayHexColor)
.setTitle(`${reply.Offer.Embeds.OfferTicket.Title}`)
.setDescription(
    reply.Offer.Embeds.OfferTicket.Description
        .replace("[COUNT]", CountsDB)
        .replace("[OFFERNAME]", OfferDB.Name || "No Offer Name")
     .replace("[OFFERMESSAGE]", OfferDB?.OfferText || "No Offer Message")
        .replace("[OWNER]", CareteBy?.user || "Unknown")
)

                .setTimestamp()
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.avatarURL({ dynamic: true }) });

            const Ticketbuttons = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId(`${CountsDB}_ticketclose`)
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Close")
                    .setDisabled(false),
            ]);
db.set(`alreadyCreated_${interaction.user.id}_${interaction.guild.id}`, true);

const ticketNumber = db.get("ticketID_" + interaction.guild.id) || 1; 
const ticketnumber = String(ticketNumber).padStart(4, '0');
db.set("ticketID_" + interaction.guild.id, ticketNumber + 1); 



            const channel = await interaction.guild.channels.create({
                name: `offer-${ticketnumber}`,
                type: ChannelType.GuildText,
                parent: panal_categoryID,
                topic: interaction.user.id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: ["ViewChannel"],
                    },
                    {
                        id: interaction.user.id,
                        allow: ["ViewChannel", "SendMessages"],
                    },
                    {
                        id: roleid,  
                        allow: ["ViewChannel", "SendMessages"],
                    },
                    {
                        id: roleid1,  
                        allow: ["ViewChannel", "SendMessages"],
                    },
                    {
                        id: CareteBy.id,  
                        allow: ["ViewChannel", "SendMessages"],
                    },
                ],
            });
                   await channel.send({embeds: [embed], components: [Ticketbuttons], content: `${interaction.user}, ${CareteBy.user}` });
            await interaction.reply({
                content: reply.Ticket.Reply9.replace("[CHANNEL]", channel),
                ephemeral: true,
            });
        } catch (error) {
            console.log(error);
            return interaction.reply({ content: "An error occurred while creating the ticket.", ephemeral: true });
        }
    }
};