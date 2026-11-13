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
    name: "ticketsetup",
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
            let panal_message = interaction.fields.getTextInputValue("panal_message")
            let panal_message_type = interaction.fields.getTextInputValue("panal_message_type")
            let panal_welcome = interaction.fields.getTextInputValue("panal_welcome")
            let panal_welcome_type = interaction.fields.getTextInputValue("panal_welcome_type")
            let data = db.get("ticketSetupData_" + ID) || null
            if (!data) return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })

            let { panal_channelID, panal_categoryID, button_name, button_color, button_emoji, support_role } = data
            await db.delete("ticketSetupData_" + ID)

            let prosMsg = interaction.channel.messages.cache.get(ID)
            if (prosMsg) prosMsg.delete().catch()
            let panal_channel = interaction.guild.channels.cache.get(panal_channelID)
            if (!panal_channel) return interaction.reply({ content: reply.Ticket.Reply6, ephemeral: true, allowedMentions: { repliedUser: false } })

            if (!panal_message_type.toLowerCase() != 'embed' && panal_message_type.toLowerCase() != 'message') panal_message_type = 'embed'
            if (!panal_welcome_type.toLowerCase() != 'embed' && panal_welcome_type.toLowerCase() != 'message') panal_welcome_type = 'embed'

            let embed = new EmbedBuilder()
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setColor(interaction.guild.members.me.displayHexColor)
                .setTimestamp()
                .setDescription(panal_message)
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })

            const button = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId(support_role + "_" + panal_categoryID + "_1" + "_ticket")
                    .setStyle(parseInt(button_color || 1))
                    .setLabel(button_name)
            ]);
            if(button_emoji){
                button.components[0].setEmoji(button_emoji)
            }

            if (panal_message_type.toLowerCase() == 'embed') {
                panal_channel.send({ embeds: [embed], components: [button] }).then( async (msg) => {
                    db.set("ticketData_" + msg.id,
                        {
                            panal_channelID: panal_channelID,
                            panel_message: panal_message,
                            buttonsData:{
                                button1:{
                                    panal_categoryID: panal_categoryID,
                                    button_name: button_name,
                                    button_color: button_color,
                                    button_emoji: button_emoji,
                                    support_role: support_role,
                                    modals: [],
                                    welcome:{
                                        message: panal_welcome,
                                        type: panal_welcome_type
                                    }
                                }
                            },
                        }
                    )
                    interaction.reply({ content: reply.Ticket.Reply7.replace("[CHANNEL]", panal_channel), ephemeral: true, })
                }).catch(async (error) => {
                    console.log(error)
                    try {
                        return await interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
                    } catch {
                        return await interaction.channel.send({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
                    }
                })
            }else{
                panal_channel.send({ content: panal_message , components: [button] }).then( async (msg) => {
                    db.set("ticketData_" + msg.id,
                        {
                            panal_channelID: panal_channelID,
                            panel_message: panal_message,
                            buttonsData:{
                                button1:{
                                    panal_categoryID: panal_categoryID,
                                    button_name: button_name,
                                    button_color: button_color,
                                    button_emoji: button_emoji,
                                    support_role: support_role,
                                    modals: [],
                                    welcome:{
                                        message: panal_welcome,
                                        type: panal_welcome_type
                                    }
                                }
                            },
                        }
                    )
                    interaction.reply({ content: reply.Ticket.Reply7.replace("[CHANNEL]", panal_channel), ephemeral: true, })
                }).catch(async (error) => {
                    console.log(error)
                    try {
                        return await interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
                    } catch {
                        return await interaction.channel.send({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
                    }
                })
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } }).catch(() => {
                return interaction.channel.send({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
            })
        }
    }
}