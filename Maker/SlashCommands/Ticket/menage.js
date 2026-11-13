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
const isImageUrl = require('is-image-url');
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("ticket")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-manage')
        .setDescription('Manage ticket panal.')
        .addStringOption(ID => ID
            .setName("message_id")
            .setDescription("Put the id of panal message.")
            .setRequired(true))
        .addStringOption(manage => manage
            .setName("type")
            .setDescription("Pick the manage mode type.")
            .setRequired(true)
            .addChoices(
                { name: "Add Button", value: "add_button" },
                { name: "Manage Thumbnail", value: "thumbnail" },
                { name: "Manage  Image", value: "image" },
                { name: "Panal Message", value: "message" },
                { name: "Manage Modals", value: "modals" },
            ))

        // Add button
        .addChannelOption(channel => channel
            .setName("ticket_category")
            .setDescription("Select category for the new button in panal.")
            .addChannelTypes(ChannelType.GuildCategory))
        .addStringOption(name => name
            .setName("button_name")
            .setDescription("Type the name of the button.")
            .setMaxLength(40))
        .addRoleOption(role => role
            .setName("support_role")
            .setDescription("Select the role for the support team."))
        .addStringOption(color => color
            .setName("button_color")
            .setDescription("Pick the color of the button.")
            .addChoices(
                { name: "Blue", value: "1" },
                { name: "Gray", value: "2" },
                { name: "Green", value: "3" },
                { name: "Red", value: "4" },
            ))
        .addStringOption(emoji => emoji
            .setName("button_emoji")
            .setDescription("Type emoji for the button."))

        // Add image
        .addStringOption(img => img
            .setName("image_url")
            .setDescription("Put the image URL."))

        // Manage modals
        .addStringOption(modal => modal
            .setName("modal_action")
            .setDescription("Pick the action to manage the modal.")
            .addChoices(
                { name: "Add input", value: "add" },
                { name: "Remove all inputs", value: "remove" },
            ))
        .addStringOption(modal => modal
            .setName("modal_button_id")
            .setDescription("Pick the button id to add the modal to.")
            .addChoices(
                { name: "1", value: "1" },
                { name: "2", value: "2" },
                { name: "3", value: "3" },
                { name: "4", value: "4" },
                { name: "5", value: "5" },
            ))
    ,
    type: "Ticket",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let ID = interaction.options.getString("message_id")
            let manage_type = interaction.options.getString("type")

            if (isNaN(ID)) return interaction.reply({ content: reply.Ticket.Reply24, ephemeral: true, allowedMentions: { repliedUser: false } })

            let msg = []
            let messages = await interaction.channel.messages.fetch();
            messages.filter((m) => {
                if (m.author.id == client.user.id && m.id == ID && m.components[0]) {
                    msg.push(m)
                }
            });

            if (!msg.length)
                return interaction.reply({ content: reply.Ticket.Reply25, ephemeral: true, allowedMentions: { repliedUser: false } })

            let panal = interaction.channel.messages.cache.get(msg[0].id)

            let useEmbed = new EmbedBuilder()
                .setColor("DarkButNotBlack")
                .setTitle(reply.Ticket.Manage.useET)
                .setDescription(`</${interaction.commandName}:${interaction.commandId}>`)

            if (manage_type == "add_button") {
                let panal_category = interaction.options.getChannel("ticket_category")
                let button_name = interaction.options.getString("button_name")
                let support_role = interaction.options.getRole("support_role")
                let button_color = interaction.options.getString("button_color") || 1
                let button_emoji = interaction.options.getString("button_emoji") || null
                if (!panal_category || !button_name || !support_role)
                    return interaction.reply({
                        embeds: [
                            useEmbed
                                .addFields(
                                    { name: "ticket_category", value: reply.Ticket.Manage.req, inline: true },
                                    { name: "button_name", value: reply.Ticket.Manage.req, inline: true },
                                    { name: "support_role", value: reply.Ticket.Manage.req, inline: true },
                                    { name: "button_color", value: reply.Ticket.Manage.nreq, inline: true },
                                    { name: "button_emoji", value: reply.Ticket.Manage.nreq, inline: true },
                                )
                        ], ephemeral: true
                    })
                let msg = await interaction.channel.send({ content: reply.Others.Reply19, allowedMentions: { repliedUser: false } })

                const modal = new ModalBuilder()
                    .setCustomId(msg.id + "_" + ID + "_addbutton" + "_ticketmanage")
                    .setTitle(reply.Ticket.Modals.manage.t);

                const input1 = new TextInputBuilder()
                    .setCustomId('panal_welcome')
                    .setRequired(true)
                    .setLabel(reply.Ticket.Modals.manage.inp1)
                    .setMaxLength(2000)
                    .setStyle(TextInputStyle.Paragraph);
                const input2 = new TextInputBuilder()
                    .setCustomId('panal_welcome_type')
                    .setRequired(true)
                    .setLabel(reply.Ticket.Modals.manage.inp2)
                    .setPlaceholder("message / embed")
                    .setStyle(TextInputStyle.Short);


                const the_input1 = new ActionRowBuilder().addComponents(input1);
                const the_input2 = new ActionRowBuilder().addComponents(input2);

                modal.addComponents(the_input1, the_input2);

                db.set("ticketManageData_" + msg.id, {
                    categoryID: panal_category.id,
                    button_name: button_name,
                    button_color: button_color,
                    button_emoji: button_emoji,
                    support_role: support_role.id,
                }).then(() => {
                    interaction.showModal(modal);
                }).catch((error) => {
                    console.log(error)
                    return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
                })
            } else if (manage_type == "thumbnail") {
                if (!panal.embeds[0])
                    return interaction.reply({ content: reply.Ticket.Reply29, ephemeral: true, allowedMentions: { repliedUser: false } })
                let img = interaction.options.getString("image_url")
                if (img && !isImageUrl(img)) {
                    return interaction.reply({ content: reply.Others.Reply1, allowedMentions: { repliedUser: false } });
                }
                if (!img && !panal.embeds[0].thumbnail)
                    return interaction.reply({
                        embeds: [
                            useEmbed
                                .addFields(
                                    { name: "image_url", value: reply.Ticket.Manage.req, inline: true },
                                )
                        ], ephemeral: true
                    })
                if (img) {
                    let embed = new EmbedBuilder()
                        .setColor(panal.embeds[0].color)
                        .setDescription(panal.embeds[0].description)
                        .setFooter(panal.embeds[0].footer)
                        .setAuthor(panal.embeds[0].author)
                        .setTimestamp(new Date(panal.embeds[0].timestamp))
                        .setThumbnail(img)
                    if (panal.embeds[0].image) embed.setImage(panal.embeds[0].image.proxyURL)
                    panal.edit({ embeds: [embed] }).then(() => {
                        return interaction.reply({ content: reply.Ticket.Reply30, ephemeral: true, allowedMentions: { repliedUser: false } })
                    })
                } else {
                    let embed = new EmbedBuilder()
                        .setColor(panal.embeds[0].color)
                        .setDescription(panal.embeds[0].description)
                        .setFooter(panal.embeds[0].footer)
                        .setAuthor(panal.embeds[0].author)
                        .setTimestamp(new Date(panal.embeds[0].timestamp))
                    if (panal.embeds[0].image) embed.setImage(panal.embeds[0].image.proxyURL)
                    panal.edit({ embeds: [embed] }).then(() => {
                        return interaction.reply({ content: reply.Ticket.Reply30, ephemeral: true, allowedMentions: { repliedUser: false } })
                    })
                }
            } else if (manage_type == "image") {
                if (!panal.embeds[0])
                    return interaction.reply({ content: reply.Ticket.Reply29, ephemeral: true, allowedMentions: { repliedUser: false } })
                let img = interaction.options.getString("image_url")
                if (img && !isImageUrl(img)) {
                    return interaction.reply({ content: reply.Others.Reply1, allowedMentions: { repliedUser: false } });
                }
                if (!img && !panal.embeds[0].image)
                    return interaction.reply({
                        embeds: [
                            useEmbed
                                .addFields(
                                    { name: "image_url", value: reply.Ticket.Manage.req, inline: true },
                                )
                        ], ephemeral: true
                    })
                if (img) {
                    let embed = new EmbedBuilder()
                        .setColor(panal.embeds[0].color)
                        .setDescription(panal.embeds[0].description)
                        .setFooter(panal.embeds[0].footer)
                        .setAuthor(panal.embeds[0].author)
                        .setTimestamp(new Date(panal.embeds[0].timestamp))
                        .setImage(img)
                    if (panal.embeds[0].thumbnail) embed.setImage(panal.embeds[0].thumbnail.proxyURL)
                    panal.edit({ embeds: [embed] }).then(() => {
                        return interaction.reply({ content: reply.Ticket.Reply30, ephemeral: true, allowedMentions: { repliedUser: false } })
                    })
                } else {
                    let embed = new EmbedBuilder()
                        .setColor(panal.embeds[0].color)
                        .setDescription(panal.embeds[0].description)
                        .setFooter(panal.embeds[0].footer)
                        .setAuthor(panal.embeds[0].author)
                        .setTimestamp(new Date(panal.embeds[0].timestamp))
                    if (panal.embeds[0].thumbnail) embed.setImage(panal.embeds[0].thumbnail.proxyURL)
                    panal.edit({ embeds: [embed] }).then(() => {
                        return interaction.reply({ content: reply.Ticket.Reply30, ephemeral: true, allowedMentions: { repliedUser: false } })
                    })
                }
            } else if (manage_type == "message") {
                const modal = new ModalBuilder()
                    .setCustomId(msg.id + "_" + ID + "_changemessage" + "_ticketmanage")
                    .setTitle(reply.Ticket.Modals.manage.t);

                const input1 = new TextInputBuilder()
                    .setCustomId('panal_message')
                    .setRequired(true)
                    .setLabel(reply.Ticket.Modals.manage.inp1)
                    .setMaxLength(2000)
                    .setStyle(TextInputStyle.Paragraph);
                const input2 = new TextInputBuilder()
                    .setCustomId('panal_message_type')
                    .setRequired(true)
                    .setLabel(reply.Ticket.Modals.manage.inp2)
                    .setPlaceholder("message / embed")
                    .setStyle(TextInputStyle.Short);


                const the_input1 = new ActionRowBuilder().addComponents(input1);
                const the_input2 = new ActionRowBuilder().addComponents(input2);

                modal.addComponents(the_input1, the_input2);
                await interaction.showModal(modal);
            } else if (manage_type == "modals") {
                let action = interaction.options.getString("modal_action")
                let buttonId = interaction.options.getString("modal_button_id")
                if (!action || !buttonId)
                    return interaction.reply({
                        embeds: [
                            useEmbed
                                .addFields(
                                    { name: "modal_action", value: reply.Ticket.Manage.req, inline: true },
                                    { name: "modal_button_id", value: reply.Ticket.Manage.req, inline: true },
                                )
                        ], ephemeral: true
                    })

                if (action == "add") {
                    let ticketData = db.get("ticketData_" + ID);
                    let buttonData = ticketData.buttonsData[`button${buttonId}`] || null
                    if(!buttonData)
                    return interaction.reply({ content: reply.Ticket.Reply35.replace("[ID]", buttonId), ephemeral: true, allowedMentions: { repliedUser: false } });

                    const modal = new ModalBuilder()
                        .setCustomId(msg.id + "_" + ID + "_addmodal" + "_" + buttonId + "_ticketmanage")
                        .setTitle(reply.Ticket.Modals.manage.t);

                    const input1 = new TextInputBuilder()
                        .setCustomId('text')
                        .setRequired(true)
                        .setLabel(reply.Ticket.Modals.manage.inp3)
                        .setMaxLength(45)
                        .setStyle(TextInputStyle.Short);
                    const input2 = new TextInputBuilder()
                        .setCustomId('type')
                        .setRequired(true)
                        .setLabel(reply.Ticket.Modals.manage.inp4)
                        .setPlaceholder("short / long")
                        .setMaxLength(5)
                        .setStyle(TextInputStyle.Short);


                    const the_input1 = new ActionRowBuilder().addComponents(input1);
                    const the_input2 = new ActionRowBuilder().addComponents(input2);

                    modal.addComponents(the_input1, the_input2);
                    await interaction.showModal(modal);
                } else {
                    let ticketData = db.get("ticketData_" + ID);
                    let buttonData = ticketData.buttonsData[`button${buttonId}`] || null
                    if(!buttonData)
                    return interaction.reply({ content: reply.Ticket.Reply35.replace("[ID]", buttonId), ephemeral: true, allowedMentions: { repliedUser: false } });
                    ticketData.buttonsData[`button${buttonId}`].modals = []
                    db.set("ticketData_" + ID, ticketData)
                    interaction.reply({ content: reply.Ticket.Reply34, ephemeral: true, allowedMentions: { repliedUser: false } });
                }
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};