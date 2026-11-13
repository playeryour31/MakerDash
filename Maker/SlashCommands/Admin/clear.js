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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Cleans messages from the channel.')
        .addIntegerOption(number => number
            .setName("number_of_messages")
            .setDescription("Number of messages to delete.")
            .setMaxValue(1000)
            .setMinValue(1)
            .setRequired(true))
        .addUserOption(user => user
            .setName("filter_by_user")
            .setDescription("Filter by user messages."))
        .addRoleOption(role => role
            .setName("filter_by_role")
            .setDescription("Filter by role messages."))
        .addStringOption(bot => bot
            .setName("filter_by_bots")
            .addChoices(
                { name: 'True', value: 'true' },
                { name: 'False', value: 'false' }
            )
            .setDescription("Filter by bots messages."))
    ,
    type: "System",
    botP: [PermissionFlagsBits.ManageMessages],
    userP: [PermissionFlagsBits.ManageMessages],
    P: "ManageMessages"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let number = interaction.options.getInteger("number_of_messages")
            let user_filter = interaction.options.getUser("filter_by_user")
            let role_filter = interaction.options.getRole("filter_by_role")
            let bots_filter = interaction.options.getString("filter_by_bots")

            let delmsg = await interaction.reply({ content: reply.System.Clear3, allowedMentions: { repliedUser: false } })
            let i = 0
            let msgToDel1 = []
            let msgToDel2 = []
            let msgToDel3 = []
            let msgToDel4 = []
            let msgToDel5 = []
            let msgToDel6 = []
            let msgToDel7 = []
            let msgToDel8 = []
            let msgToDel9 = []
            let msgToDel10 = []

            let messages = await interaction.channel.messages.fetch();

            if (user_filter) {
                messages = messages.filter((m) => {
                    if (m.author.id == user_filter.id && i < number && m.id != delmsg.id) {
                        if (msgToDel1.length != 100) {
                            msgToDel1.push(m)
                        }
                        else if (msgToDel2.length != 100) {
                            msgToDel2.push(m)
                        }
                        else if (msgToDel3.length != 100) {
                            msgToDel3.push(m)
                        }
                        else if (msgToDel4.length != 100) {
                            msgToDel4.push(m)
                        }
                        else if (msgToDel5.length != 100) {
                            msgToDel5.push(m)
                        }
                        else if (msgToDel6.length != 100) {
                            msgToDel6.push(m)
                        }
                        else if (msgToDel7.length != 100) {
                            msgToDel7.push(m)
                        }
                        else if (msgToDel8.length != 100) {
                            msgToDel8.push(m)
                        }
                        else if (msgToDel9.length != 100) {
                            msgToDel9.push(m)
                        }
                        else if (msgToDel10.length != 100) {
                            msgToDel10.push(m)
                        }
                        i++
                    }
                });
            }else if(role_filter){
                messages = messages.filter((m) => {
                    let member = interaction.guild.members.cache.get(m.author.id);
                    if (member.roles.cache.has(role_filter.id)) {
                        if (msgToDel1.length != 100) {
                            msgToDel1.push(m)
                        }
                        else if (msgToDel2.length != 100) {
                            msgToDel2.push(m)
                        }
                        else if (msgToDel3.length != 100) {
                            msgToDel3.push(m)
                        }
                        else if (msgToDel4.length != 100) {
                            msgToDel4.push(m)
                        }
                        else if (msgToDel5.length != 100) {
                            msgToDel5.push(m)
                        }
                        else if (msgToDel6.length != 100) {
                            msgToDel6.push(m)
                        }
                        else if (msgToDel7.length != 100) {
                            msgToDel7.push(m)
                        }
                        else if (msgToDel8.length != 100) {
                            msgToDel8.push(m)
                        }
                        else if (msgToDel9.length != 100) {
                            msgToDel9.push(m)
                        }
                        else if (msgToDel10.length != 100) {
                            msgToDel10.push(m)
                        }
                        i++
                    }
                });
            }else if (bots_filter == "true") {
                messages = messages.filter((m) => {
                    if (m.author.bot && i < number && m.id != delmsg.id) {
                        if (msgToDel1.length != 100) {
                            msgToDel1.push(m)
                        }
                        else if (msgToDel2.length != 100) {
                            msgToDel2.push(m)
                        }
                        else if (msgToDel3.length != 100) {
                            msgToDel3.push(m)
                        }
                        else if (msgToDel4.length != 100) {
                            msgToDel4.push(m)
                        }
                        else if (msgToDel5.length != 100) {
                            msgToDel5.push(m)
                        }
                        else if (msgToDel6.length != 100) {
                            msgToDel6.push(m)
                        }
                        else if (msgToDel7.length != 100) {
                            msgToDel7.push(m)
                        }
                        else if (msgToDel8.length != 100) {
                            msgToDel8.push(m)
                        }
                        else if (msgToDel9.length != 100) {
                            msgToDel9.push(m)
                        }
                        else if (msgToDel10.length != 100) {
                            msgToDel10.push(m)
                        }
                        i++
                    }
                });
            }else {
                messages = messages.filter((m) => {
                    if (i < number && m.id != delmsg.id) {
                        if (msgToDel1.length != 100) {
                            msgToDel1.push(m)
                        }
                        else if (msgToDel2.length != 100) {
                            msgToDel2.push(m)
                        }
                        else if (msgToDel3.length != 100) {
                            msgToDel3.push(m)
                        }
                        else if (msgToDel4.length != 100) {
                            msgToDel4.push(m)
                        }
                        else if (msgToDel5.length != 100) {
                            msgToDel5.push(m)
                        }
                        else if (msgToDel6.length != 100) {
                            msgToDel6.push(m)
                        }
                        else if (msgToDel7.length != 100) {
                            msgToDel7.push(m)
                        }
                        else if (msgToDel8.length != 100) {
                            msgToDel8.push(m)
                        }
                        else if (msgToDel9.length != 100) {
                            msgToDel9.push(m)
                        }
                        else if (msgToDel10.length != 100) {
                            msgToDel10.push(m)
                        }
                        i++
                    }
                });
            }
            interaction.channel.bulkDelete(msgToDel1, true);
            if (msgToDel2.length) {
                interaction.channel.bulkDelete(msgToDel2, true);
            }
            if (msgToDel3.length) {
                interaction.channel.bulkDelete(msgToDel3, true);
            }
            if (msgToDel4.length) {
                interaction.channel.bulkDelete(msgToDel4, true);
            }
            if (msgToDel5.length) {
                interaction.channel.bulkDelete(msgToDel5, true);
            }
            if (msgToDel6.length) {
                interaction.channel.bulkDelete(msgToDel6, true);
            }
            if (msgToDel7.length) {
                interaction.channel.bulkDelete(msgToDel7, true);
            }
            if (msgToDel8.length) {
                interaction.channel.bulkDelete(msgToDel8, true);
            }
            if (msgToDel9.length) {
                interaction.channel.bulkDelete(msgToDel9, true);
            }
            if (msgToDel10.length) {
                interaction.channel.bulkDelete(msgToDel10, true);
            }
            delmsg.edit({ content: reply.System.Clear4.replace("[NUMBER]", i), allowedMentions: { repliedUser: false } }).then(() => {
                setTimeout(() => {
                    if (delmsg) {
                        delmsg?.delete().catch()
                    }
                }, 3000)
            }).catch(() =>{
                
            })

        } catch (error) {
            console.log(error)
            return interaction.channel.send({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};