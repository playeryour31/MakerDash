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


module.exports = {
    data: new SlashCommandBuilder()
        .setName('selfrole-manage')
        .setDescription('Manage new Selfrole panal.')
        .addStringOption(id => id
            .setName("panal_id")
            .setDescription("Put the id of the panal.")
            .setRequired(true))
        .addRoleOption(role => role
            .setName("role")
            .setDescription("Pick the role to add.")
            .setRequired(true))
        .addStringOption(name => name
            .setName("name")
            .setDescription("Type the name of the role")
            .setMaxLength(20)
            .setRequired(true))
        .addStringOption(color => color
            .setName("button_color")
            .setDescription("Pick the color of the button.")
            .addChoices(
                { name: "Blue", value: "1" },
                { name: "Gray", value: "2" },
                { name: "Green", value: "3" },
                { name: "Red", value: "4" },
            ))
        .addStringOption(action => action
            .setName("action")
            .setDescription("Select the action of manage.")
            .addChoices(
                { name: "Add", value: "add" },
                { name: "Remove", value: "remove" },
            ))
    ,
    type: "Selfrole",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let ID = interaction.options.getString("panal_id")
            let role = interaction.options.getRole("role")
            let name = interaction.options.getString("name")
            let color = interaction.options.getString("button_color") || 1
            let action = interaction.options.getString("action") || "add"

            if (isNaN(ID))
                return interaction.reply({ content: reply.Selfrole.Reply13, ephemeral: true, allowedMentions: { repliedUser: false } })

            let msg = []
            let messages = await interaction.channel.messages.fetch();
            messages.filter((m) => {
                if (m.author.id == client.user.id && m.id == ID) {
                    msg.push(m)
                }
            });

            if (!msg.length)
                return interaction.reply({ content: reply.Selfrole.Reply14, ephemeral: true, allowedMentions: { repliedUser: false } })

            let panal_type = msg[0].components[0].components[0].data.type //Button = 2 SelectMenu = 3

            if (panal_type == 2 && msg[0].components[0].components[0].data.custom_id.split("_")[1].trim() != "role")
                return interaction.reply({ content: reply.Selfrole.Reply15, ephemeral: true, allowedMentions: { repliedUser: false } })

            if (panal_type == 3 && msg[0].components[0].components[0].data.custom_id != "selfrolemenu")
                return interaction.reply({ content: reply.Selfrole.Reply15, ephemeral: true, allowedMentions: { repliedUser: false } })

            let panal = interaction.channel.messages.cache.get(msg[0].id)
            if (!panal)
                return interaction.reply({ content: reply.Selfrole.Reply18, ephemeral: true, allowedMentions: { repliedUser: false } })

            if (panal_type == 2) {
                let oldbts = panal.components[0].components;
                if (action == "add") {
                    if (oldbts.length >= 5)
                        return interaction.reply({ content: reply.Selfrole.Reply16.replace("[T]", "buttons").replace("[NUMBER]", 5), ephemeral: true, allowedMentions: { repliedUser: false } })

                    let nbu = new ButtonBuilder()
                        .setCustomId(role.id + "_role")
                        .setLabel(name)
                        .setStyle(parseInt(color))
                    oldbts.push(nbu);

                    await panal.edit({ components: [new ActionRowBuilder().addComponents(oldbts)] }).then(() => {
                        interaction.reply({ content: reply.Selfrole.Reply17.replace("[T]", "button"), ephemeral: true, allowedMentions: { repliedUser: false } })
                    })
                } else {
                    if (oldbts.length == 1)
                        return interaction.reply({ content: reply.Selfrole.Reply19.replace("[T]", "button"), ephemeral: true, allowedMentions: { repliedUser: false } })

                    let check = oldbts.find(d => d.label.toString() == name && d.data.custom_id.split("_")[0].trim() == role.id);

                    if (!check)
                        return interaction.reply({ content: reply.Selfrole.Reply21.replace("[T]", "button"), ephemeral: true, allowedMentions: { repliedUser: false } })

                    oldbts.forEach((btn, index) => {
                        if (btn.data.custom_id.split("_")[0].trim() == role.id && btn.data.label == name) {
                            oldbts.splice(index, 1);
                        }
                    });

                    await panal.edit({ components: [new ActionRowBuilder().addComponents(oldbts)] }).then(() => {
                        interaction.reply({ content: reply.Selfrole.Reply20.replace("[T]", "button"), ephemeral: true, allowedMentions: { repliedUser: false } });
                    });
                }
            }

            else if (panal_type == 3) {
                let dropdowns = panal.components[0].components.filter(component => component.type === 3);
                if (action == "add") {

                    if (dropdowns.length >= 25)
                        return interaction.reply({ content: reply.Selfrole.Reply16.replace("[T]", "options").replace("[NUMBER]", 25), ephemeral: true, allowedMentions: { repliedUser: false } })

                    const newOption = {
                        label: name,
                        value: role.id,
                    };

                    dropdowns[0].options.push(newOption);

                    const selfRoleRestIndex = dropdowns[0].options.findIndex(option => option.value === "selfrolerest");
                    if (selfRoleRestIndex !== -1) {
                        const selfRoleRestOption = dropdowns[0].options.splice(selfRoleRestIndex, 1);
                        dropdowns[0].options.push(selfRoleRestOption[0]);
                    }

                    await panal.edit({
                        components: [new ActionRowBuilder().addComponents(dropdowns)]
                    }).then(() => {
                        interaction.reply({ content: reply.Selfrole.Reply17.replace("[T]", "option"), ephemeral: true, allowedMentions: { repliedUser: false } })
                    })

                } else {
                    if (dropdowns[0].options.length == 1)
                        return interaction.reply({ content: reply.Selfrole.Reply19.replace("[T]", "option"), ephemeral: true, allowedMentions: { repliedUser: false } })

                    let check = dropdowns[0].options.find(d => d.label.toString() == name && d.value == role.id);
                    if (!check)
                        return interaction.reply({ content: reply.Selfrole.Reply21.replace("[T]", "option"), ephemeral: true, allowedMentions: { repliedUser: false } })

                    dropdowns[0].options.forEach((option, index) => {
                        if (option.value === role.id && option.label === name) {
                            dropdowns[0].options.splice(index, 1);
                        }
                    });

                    await panal.edit({
                        components: [new ActionRowBuilder().addComponents(dropdowns)]
                    }).then(() => {
                        interaction.reply({ content: reply.Selfrole.Reply20.replace("[T]", "option"), ephemeral: true, allowedMentions: { repliedUser: false } });
                    });
                }
            }

            else {
                return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};