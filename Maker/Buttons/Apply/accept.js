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
    ChatInputCommandInteraction,
} = require("discord.js");
const db = require("../../lib/applyDb")
module.exports = {
    name: "accept",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const user = interaction.customId.split("_")[0].trim()
            const role = interaction.customId.split("_")[1].trim()
            let member = interaction.guild.members.cache.get(user)
            let dmMode = await db.get("dm_Mode_" + interaction.guild.id + "_" + client.user.id) || { accept: "off", reject: "off" }
            let applyAdmin = await db.get("applyAdmin_" + interaction.guild.id + "_" + client.user.id) || "123"

            if (applyAdmin && !interaction.member.roles.cache.has(applyAdmin) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator))
                return interaction.reply({ content: reply.Apply.Reply15.replace("ROLE", "<@&" + applyAdmin + ">"), ephemeral: true })

            if (!applyAdmin && !interaction.member.permissions.has(PermissionFlagsBits.Administrator))
                return interaction.reply({ content: reply.Apply.Reply16, ephemeral: true })

            interaction.deferUpdate();

            if (member) {
                member.roles.add(role)
                if (dmMode && dmMode.accept === 'on') {
                    let embed = new EmbedBuilder()
                        .setColor('Green')
                        .setTimestamp()
                        .setTitle(reply.Apply.Buttons.accept.dm.t)
                        .setDescription(reply.Apply.Buttons.accept.dm.dec.replace("[USER]", interaction.user).replace("[ROLE]", "<@&" + role + ">"))
                        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    member.send({ embeds: [embed] }).catch(err => { })
                }
            }

            const results = await db.get("resultsLog_"+ interaction.guild.id + "_" + client.user.id) || null
            if(results){
                const resultsChannel = await client.channels.cache.get(results)
                if (resultsChannel && resultsChannel.isTextBased?.()) {
                const embed = new EmbedBuilder()
                .setColor('Green')
                .setTimestamp()
                .setTitle(reply.Apply.Buttons.accept.t)
                .setDescription(reply.Apply.Buttons.accept.dec.replace("[USER]", interaction.user).replace("[AUTHOR]", "<@!" + user + ">").replace("[ROLE]", "<@&" + role + ">"))
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                await resultsChannel.send({content: "<@!" + user + ">" ,embeds: [embed]}).catch(() => {})
                }
            }

            let embed = new EmbedBuilder(interaction.message.embeds[0])
            .setDescription(interaction.message.embeds[0].description + reply.Apply.Buttons.application.by.replace("[USER]", interaction.user))
            .setColor("Green");

            const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setCustomId(user + "_" + role + "_accept")
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
                .setLabel("Accept"),
                new ButtonBuilder()
                .setCustomId(user + "_" + role + "_reject")
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
                .setLabel("Reject"),
            );

            interaction.message.edit({embeds: [embed] , components: [button] })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    }
}
