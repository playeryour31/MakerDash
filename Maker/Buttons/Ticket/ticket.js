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
const db = require("../../lib/featureDb")("ticket")
const db2 = require("../../lib/featureDb")("temp_ticket")

module.exports = {
    name: "ticket",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            let roleid = interaction.customId.split("_")[0].trim()
            let categoryID = interaction.customId.split("_")[1].trim()
            let buttonID = interaction.customId.split("_")[2].trim()
            let data = db.get("ticketData_" + interaction.message.id) || null
            if (!data) return interaction.deferUpdate();
            let ticketData = data.buttonsData["button" + buttonID];
            if (!ticketData) return interaction.deferUpdate();

            let ticketLimits = db.get(`ticketsLimit_${interaction.guild.id}`) || 50
            let userTickets = 0
            if(ticketLimits){
                interaction.guild.channels.cache.forEach(channel =>{
                    try {
                        if(!channel.topic) return
                        if (!channel.type == ChannelType.GuildText) return;
                        if (!channel.viewable) return;
                        let ticketCheck = db2.get(client.user.id + "_" + channel.id) || null
                        if(!ticketCheck) return
                        if(channel.topic == interaction.user.id) ++userTickets
                    } catch (error) {
                        console.log(error)
                    }
                })
            }
            if(ticketLimits <= userTickets) return interaction.reply({content: reply.Ticket.Reply37.replace("[LIMIT]", ticketLimits), ephemeral:true})
            let { panal_categoryID, welcome, modals } = ticketData

            if(modals.length > 0){
                const modal = new ModalBuilder()
                .setCustomId(roleid + "_" + buttonID + "_ticket")
                .setTitle(reply.Ticket.Reply33);

                modals.forEach((d, index) => {
                    const input = new TextInputBuilder()
                        .setCustomId('inp' + (index + 1))
                        .setRequired(true)
                        .setLabel(d.label)
                        .setStyle(d.type);
                        if(d.place){
                            input.setPlaceholder(d.place)
                        }
                        if(d.max){
                            input.setMaxLength(d.max)
                        }
                        if(d.min){
                            input.setMinLength(d.min)
                        }
                    const actionRow = new ActionRowBuilder().addComponents(input);
                
                    modal.addComponents(actionRow);
                });
                
                await interaction.showModal(modal);
                
            }
            else{
                let welcome_type = welcome.type || "embed"
                let welcome_message = welcome.message || "..."
    
                interaction.reply({
                    content: reply.Ticket.Reply8,
                    ephemeral: true,
                });
    
                const embed = new EmbedBuilder()
                    .setColor(interaction.guild.members.me.displayHexColor)
                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setDescription(welcome_message)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.username, iconURL: interaction.user.avatarURL({ dynamic: true }) })
    
                const Ticketbuttons = new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setCustomId("ticket_close")
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel("Close")
                        .setDisabled(false),
                    new ButtonBuilder()
                        .setCustomId(roleid + "_claim")
                        .setStyle(ButtonStyle.Success)
                        .setLabel("Claim")
                        .setDisabled(false),
                ]);
                const ticketNumber = db.get("ticketID_" + interaction.message.id + "_" + buttonID) || 1
                const ticketnumber = String(ticketNumber).padStart(4, '0');
                db.set("ticketID_" + interaction.message.id + "_" + buttonID, ticketNumber + 1)
    
                const channel = await interaction.guild.channels.create({
                    name: `ticket-${ticketnumber}`,
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
                    ]
                }
                );
    
                db2.set("ticketData_" + client.user.id + "_" + channel.id, ticketData)
    
                if(welcome_type == "embed"){
                    channel.send({ content: "<@!" + interaction.member.id + ">" + "," + "<@&" + roleid + ">", embeds: [embed], components: [Ticketbuttons] })
                }else{
                    channel.send({ content: "<@!" + interaction.member.id + ">" + "," + "<@&" + roleid + ">" + "\n" + welcome_message, components: [Ticketbuttons] })
                }
    
                await interaction.editReply({
                    content: reply.Ticket.Reply9.replace("[CHANNEL]", channel),
                    ephemeral: true,
                });
            }
        } catch (error) {
            console.log(error)
            return
        }
    }
}
