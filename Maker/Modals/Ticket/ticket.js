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
            const roleid = interaction.customId.split("_")[0].trim()
            const buttonID = interaction.customId.split("_")[1].trim()

            let data = db.get("ticketData_" + interaction.message.id) || null
            if (!data) return interaction.deferUpdate();
            let ticketData = data.buttonsData["button" + buttonID];
            if (!ticketData) return interaction.deferUpdate();
            
            let { panal_categoryID , welcome, modals } = ticketData

            let fieldsNum = interaction.fields.components.length

            let info = []

            let filed1 = interaction.fields.getTextInputValue("inp1")
            info.push({name: modals[0].label, value: filed1})

            if(fieldsNum >= 2){
                let filed2 = interaction.fields.getTextInputValue("inp2")
                info.push({name: modals[1].label, value: filed2})
            }

            if(fieldsNum >= 3){
                let filed3 = interaction.fields.getTextInputValue("inp3")
                info.push({name: modals[2].label, value: filed3})
            }

            if(fieldsNum >= 4){
                let filed4 = interaction.fields.getTextInputValue("inp4")
                info.push({name: modals[3].label, value: filed4})
            }

            if(fieldsNum == 5){
                let filed5 = interaction.fields.getTextInputValue("inp5")
                info.push({name: modals[4].label, value: filed5})
            }


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
                .addFields(...info)

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
                let wel = "<@!" + interaction.member.id + ">" + "," + "<@&" + roleid + ">" + "\n" + welcome_message + "\n"
                info.forEach(qes =>{
                    wel += "\n" + "**" + qes.name + "**" + "\n" + qes.value
                })
                channel.send({ content: wel, components: [Ticketbuttons] })
            }

            await interaction.editReply({
                content: reply.Ticket.Reply9.replace("[CHANNEL]", channel),
                ephemeral: true,
            });
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } }).catch(() => {
                return interaction.channel.send({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
            })
        }
    }
}