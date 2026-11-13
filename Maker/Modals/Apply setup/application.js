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
const db = require("../../lib/applyDb")
module.exports = {
    name: "application",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const channel = interaction.customId.split("_")[0].trim()
            const requests = interaction.customId.split("_")[1].trim()
            const role = interaction.customId.split("_")[2].trim()
            const MessageSta = interaction.customId.split("_")[3].trim()

            let messageData = await db.get("appData_" + interaction?.message?.id + "_" + client.user.id) || null
            let ask1;
            let ask2;
            let ask3;
            let ask4;
            let ask5;
            if (messageData) {
                ask1 = messageData?.ask1
                ask2 = messageData?.ask2 || null
                ask3 = messageData?.ask3 || null
                ask4 = messageData?.ask4 || null
                ask5 = messageData?.ask5 || null
            } else {
                ask1 = interaction.fields.getTextInputValue("ask1")
                ask2 = interaction.fields.getTextInputValue("ask2") || null
                ask3 = interaction.fields.getTextInputValue("ask3") || null
                ask4 = interaction.fields.getTextInputValue("ask4") || null
                ask5 = interaction.fields.getTextInputValue("ask5") || null
            }


            if (MessageSta && MessageSta == "true") {
                let msg = await interaction.reply({ content: reply.Others.Reply19 })
                const button = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(channel + "_" + requests + "_" + role + "_change-messagebtn")
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Message"),
                    );
                await msg.edit({ content: reply.Apply.Reply7, components: [button] }).then(async (tt) => {
                    await db.set("appData_" + tt.id + "_" + client.user.id, {
                        ask1: ask1,
                        ask2: ask2,
                        ask3: ask3,
                        ask4: ask4,
                        ask5: ask5,
                    })
                })
            }
            else if (MessageSta && MessageSta == "done") {
                let message = interaction.fields.getTextInputValue("message")
                let type = interaction.fields.getTextInputValue("type") || "embed"
                if(type.toLowerCase() == "embed"){
                    const embed = new EmbedBuilder()
                    .setColor(interaction.guild.members.me.displayHexColor || `DarkButNotBlack`)
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setDescription(message)

                    let msg = await interaction.reply({ content: reply.Apply.Reply8, ephemeral: true, })
                    let Appchannel = interaction.guild.channels.cache.get(channel)
                    if (!Appchannel) return msg.edit({ content: reply.Apply.Reply9, ephemeral: true, allowedMentions: { repliedUser: false } })
    
                    const button = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(requests + "_" + role + "_apply")
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji("📝")
                                .setLabel(reply.Apply.ButtonName),
                        );
    
                    Appchannel.send({embeds: [embed] , components: [button] }).then(async (appmsg) => {
                        await db.set("appData_" + appmsg.id + "_" + client.user.id, {
                            message:message,
                            channel:channel,
                            ID:appmsg.id,
                            ask1: ask1,
                            ask2: ask2,
                            ask3: ask3,
                            ask4: ask4,
                            ask5: ask5,
                        }).then(() => {
                            msg.edit({ content: reply.Apply.Reply11.replace("[CHANNEL]", Appchannel), ephemeral: true, allowedMentions: { repliedUser: false } })
                        }).catch(() => {
                            msg.edit({ content: reply.Apply.Reply12, ephemeral: true, allowedMentions: { repliedUser: false } })
                        })
                    })
                }else{
                    let msg = await interaction.reply({ content: reply.Apply.Reply8, ephemeral: true, })
                    let Appchannel = interaction.guild.channels.cache.get(channel)
                    if (!Appchannel) return msg.edit({ content: reply.Apply.Reply9, ephemeral: true, allowedMentions: { repliedUser: false } })
    
                    const button = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(requests + "_" + role + "_apply")
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji("📝")
                                .setLabel(reply.Apply.ButtonName),
                        );
    
                    Appchannel.send({content: message , components: [button] }).then(async (appmsg) => {
                        await db.set("appData_" + appmsg.id + "_" + client.user.id, {
                            message:message,
                            channel:channel,
                            ID:appmsg.id,
                            ask1: ask1,
                            ask2: ask2,
                            ask3: ask3,
                            ask4: ask4,
                            ask5: ask5,
                        }).then(() => {
                            msg.edit({ content: reply.Apply.Reply11.replace("[CHANNEL]", Appchannel), ephemeral: true, allowedMentions: { repliedUser: false } })
                        }).catch(() => {
                            msg.edit({ content: reply.Apply.Reply12, ephemeral: true, allowedMentions: { repliedUser: false } })
                        })
                    })
                }
                await db.delete("appData_" + interaction?.message?.id + "_" + client.user.id)
                interaction.message.delete()
            }
            else {
                let msg = await interaction.reply({ content: reply.Apply.Reply8, ephemeral: true, })
                let Appchannel = interaction.guild.channels.cache.get(channel)
                if (!Appchannel) return msg.edit({ content: reply.Apply.Reply9, ephemeral: true, allowedMentions: { repliedUser: false } })

                const button = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(requests + "_" + role + "_apply")
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji("📝")
                            .setLabel(reply.Apply.ButtonName),
                    );

                Appchannel.send({ components: [button] }).then(async (appmsg) => {
                    await db.set("appData_" + appmsg.id + "_" + client.user.id, {
                        message: "",
                        channel:channel,
                        ID:appmsg.id,
                        ask1: ask1,
                        ask2: ask2,
                        ask3: ask3,
                        ask4: ask4,
                        ask5: ask5,
                    }).then(() => {
                        msg.edit({ content: reply.Apply.Reply11.replace("[CHANNEL]", Appchannel), ephemeral: true, allowedMentions: { repliedUser: false } })
                    }).catch(() => {
                        msg.edit({ content: reply.Apply.Reply12, ephemeral: true, allowedMentions: { repliedUser: false } })
                    })
                })
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } }).catch(() =>{
                return interaction.channel.send({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
            })
        }
    }
}