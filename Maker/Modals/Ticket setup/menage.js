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

module.exports = {
    name: "ticketmanage",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const ID = interaction.customId.split("_")[0].trim()
            const PanalID = interaction.customId.split("_")[1].trim()
            const manage_type = interaction.customId.split("_")[2].trim()

            let msg = []
            let messages = await interaction.channel.messages.fetch();
            messages.filter((m) => {
                if (m.author.id == client.user.id && m.id == PanalID && m.components) {
                    msg.push(m)
                }
            });

            if (!msg.length)
                return interaction.reply({ content: reply.Ticket.Reply26, ephemeral: true, allowedMentions: { repliedUser: false } })

            let panal = interaction.channel.messages.cache.get(msg[0].id)
            if (!panal) return interaction.reply({ content: reply.Ticket.Reply26, ephemeral: true, allowedMentions: { repliedUser: false } })


            if (manage_type == "addbutton") {
                let panal_welcome = interaction.fields.getTextInputValue("panal_welcome")
                let panal_welcome_type = interaction.fields.getTextInputValue("panal_welcome_type")

                let data = db.get("ticketManageData_" + ID) || null
                if (!data) return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
                let ticketData = db.get("ticketData_" + PanalID)
                let { categoryID, button_name, button_color, button_emoji, support_role } = data
                await db.delete("ticketManageData_" + ID)

                let prosMsg = interaction.channel.messages.cache.get(ID)
                if (prosMsg) prosMsg.delete().catch()

                let panalButton = panal.components[0].components
                if (panalButton.length >= 5)
                    return interaction.reply({ content: reply.Ticket.Reply27.replace("[TYPE]", "buttons").replace("[NUM]", 5), ephemeral: true, allowedMentions: { repliedUser: false } })


                if (!panal_welcome_type.toLowerCase() != 'embed' && panal_welcome_type.toLowerCase() != 'message') panal_welcome_type = 'embed'

                ticketData.buttonsData[`button${panalButton.length + 1}`] = {
                    panal_categoryID: categoryID,
                    button_name: button_name,
                    button_color: button_color,
                    button_emoji: button_emoji,
                    support_role: support_role,
                    modals: [],
                    welcome: {
                        message: panal_welcome,
                        type: panal_welcome_type
                    }
                };
                let nbu = new ButtonBuilder()
                    .setCustomId(support_role + "_" + categoryID + "_" + (panalButton.length + 1) + "_ticket")
                    .setLabel(button_name)
                    .setStyle(parseInt(button_color))
                if (button_emoji) nbu.setEmoji(button_emoji)
                panalButton.push(nbu)

                await panal.edit({ components: [new ActionRowBuilder().addComponents(panalButton)] }).then(() => {
                    db.set("ticketData_" + PanalID, ticketData)
                    interaction.reply({ content: reply.Ticket.Reply28.replace("[TYPE]", "button"), ephemeral: true, allowedMentions: { repliedUser: false } });
                });
            } else if (manage_type == "changemessage") {
                let panal_message = interaction.fields.getTextInputValue("panal_message")
                let panal_message_type = interaction.fields.getTextInputValue("panal_message_type")

                if (!panal_message_type.toLowerCase() != 'embed' && panal_message_type.toLowerCase() != 'message') panal_message_type = 'embed'

                if (panal_message_type.toLowerCase() == "embed") {
                    let embed = new EmbedBuilder()
                        .setDescription(panal_message)
                    if (panal.embeds[0]?.footer) {
                        embed.setFooter(panal.embeds[0].footer)
                    } else {
                        embed.setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    }
                    if (panal.embeds[0]?.color) {
                        embed.setColor(panal.embeds[0].color)
                    } else {
                        embed.setColor(interaction.guild.members.me.displayHexColor)
                    }
                    if (panal.embeds[0]?.author) {
                        embed.setAuthor(panal.embeds[0].author)
                    } else {
                        embed.setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    }
                    if (panal.embeds[0]?.timestamp) {
                        embed.setTimestamp(new Date(panal.embeds[0].timestamp))
                    } else {
                        embed.setTimestamp()
                    }
                    if (panal.embeds[0]?.image) embed.setImage(panal.embeds[0].image.proxyURL)
                    if (panal.embeds[0]?.thumbnail) embed.setImage(panal.embeds[0].thumbnail.proxyURL)

                    panal.edit({ content: '', embeds: [embed] }).then(() => {
                        return interaction.reply({ content: reply.Ticket.Reply30, ephemeral: true, allowedMentions: { repliedUser: false } })
                    })
                } else {
                    panal.edit({ content: panal_message, embeds: [] }).then(() => {
                        return interaction.reply({ content: reply.Ticket.Reply30, ephemeral: true, allowedMentions: { repliedUser: false } })
                    })
                }
            } else if (manage_type == "addmodal") {
                let input_text = interaction.fields.getTextInputValue("text");
                let input_type = interaction.fields.getTextInputValue("type");
                const buttonID = interaction.customId.split("_")[3].trim();
                let ticketData = db.get("ticketData_" + PanalID);
                let buttonModals = ticketData.buttonsData[`button${buttonID}`].modals || [];


                if (buttonModals.length >= 5) {
                    return interaction.reply({ content: reply.Ticket.Reply31, ephemeral: true, allowedMentions: { repliedUser: false } });
                }

                if (!input_type.toLowerCase() != 'long' && input_type.toLowerCase() != 'short') input_type = 'short'

                let inputType = 1
                if(input_type.toLowerCase() == 'short') inputType = 1
                if(input_type.toLowerCase() == 'long') inputType = 2

                ticketData.buttonsData[`button${buttonID}`].modals.push({
                    label: input_text,
                    type: inputType,
                    place: null,
                    max: null,
                    min: null,
                })


                db.set("ticketData_" + PanalID, ticketData)
                interaction.reply({ content: reply.Ticket.Reply32.replace("[ID]", buttonID), ephemeral: true, allowedMentions: { repliedUser: false } });
            }

        } catch (error) {
            console.log(error)
            // return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } }).catch(() => {
            // return interaction.channel.send({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
            // })
        }
    }
}