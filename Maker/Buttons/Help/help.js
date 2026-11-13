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
const prefixdb = new Database("/Database/Others/PrefixData.json");
module.exports = {
    name: "help",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
        	const commandsdb = new Database(`../Dashboard/Json-Database/CommandsData/BotsCommands_${client.user.id}.json`);
            let type = interaction.customId.split("_")[1].trim()
            let user = interaction.customId.split("_")[2]?.trim()
            if (interaction.user.id != user) return interaction.deferUpdate();
            let botCommands = commandsdb.get('commands_' + client.user.id) || []

            let msg = [];
            let seenTypes = new Set();
            let buttonsNumber = 1;
            let configB = false
            if (type == "config") configB = true
            const button1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("help_" + "config")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(configB)
                    .setLabel("Config"),
            );
            const button2 = new ActionRowBuilder().addComponents();
            const button3 = new ActionRowBuilder().addComponents();
            let inline = false
            const commandsOfType = botCommands.filter(command => command.type === type);
            const numberOfCommands = commandsOfType.length;
            if (parseInt(numberOfCommands) >= 9) inline = true

            let botPrefix = prefixdb.get("Prefix_" + client.user.id) || '--'
            botCommands.forEach((command) => {
                let helpDec;

                if (command.type.toLowerCase() == type) {
                    let prefix;
                    let commandName;
                    if (command.prefix == true) prefix = botPrefix, commandName = command.prefix_commandName, helpDec = reply.Help[command.prefix_commandName] || null
                    else prefix = "/", commandName = command.slash_commandName, helpDec = reply.Help[command.slash_commandName] || null
                    if (helpDec) {
                        msg.push({ name: prefix + commandName, value: helpDec, inline: inline })
                    }
                }
                if (!seenTypes.has(command.type) && command.type != "Config") {
                    ++buttonsNumber;
                    seenTypes.add(command.type);
                    if (buttonsNumber <= 5) {
                        const newButton = new ButtonBuilder()
                            .setCustomId("help_" + command.type.toLowerCase() + `_${user}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel(command.type);
                        if (command.type.toLowerCase() == type) {
                            newButton.setDisabled(true);
                        }
                        button1.addComponents(newButton);
                    } else if (buttonsNumber <= 10) {
                        const newButton = new ButtonBuilder()
                            .setCustomId("help_" + command.type.toLowerCase() + `_${user}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel(command.type);
                        if (command.type.toLowerCase() == type) {
                            newButton.setDisabled(true);
                        }
                        button2.addComponents(newButton);
                    } else {
                        const newButton = new ButtonBuilder()
                            .setCustomId("help_" + command.type.toLowerCase() + `_${user}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel(command.type);
                        if (command.type.toLowerCase() == type) {
                            newButton.setDisabled(true);
                        }
                        button3.addComponents(newButton);
                    }
                }
            });
            const embed = new EmbedBuilder()
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                .setTimestamp()
                .setColor(`DarkButNotBlack`)
                .setTitle(type)
                .setFooter({ text: `Requested By ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(client.user.displayAvatarURL())
                .addFields(
                    ...msg
                )
            if (buttonsNumber <= 5) {
                interaction.message.edit({ embeds: [embed], components: [button1] });
            } else if (buttonsNumber <= 10) {
                interaction.message.edit({ embeds: [embed], components: [button1, button2] });
            }else{
                interaction.message.edit({ embeds: [embed], components: [button1, button2, button3] });
            }
            interaction.deferUpdate();
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
