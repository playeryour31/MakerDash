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
const db = new Database("./Maker/Json-Database/Settings/Apply.json")

module.exports = {
    name: "selfrolepanal",
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
            const role = interaction.customId.split("_")[1].trim()
            const type = interaction.customId.split("_")[2].trim()
            const MessageSta = interaction.customId.split("_")[3].trim()
            let color = interaction.customId?.split("_")[4]?.trim() || "1"

            if (isNaN(color)) color = "1"
            let name = interaction.customId?.split("_")[5]?.trim() || interaction.fields.getTextInputValue("name")
            if(name == "selfrolepanal") name = interaction.fields.getTextInputValue("name")
            let component;
            if (type == "button") {
                component = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(role + "_role")
                            .setStyle(parseInt(color))
                            .setLabel(name),
                    );
            } else {
                component = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("selfrolemenu")
                        .setPlaceholder(reply.Selfrole.Reply3)
                        .setOptions([
                            {
                                label: name,
                                value: role
                            }
                        ])
                );
            }



            if (MessageSta == "true") {
                let msg = await interaction.reply({ content: reply.Others.Reply19 })
                const button = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(channel + "_" + role + "_" + type + "_" + name + "_" + color + "_set-panal-message")
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Message"),
                    );
                await msg.edit({ content: reply.Selfrole.Reply2, components: [button] })
            }

            else if (MessageSta == "done") {
                let msg = await interaction.reply({ content: reply.Selfrole.Reply6, ephemeral: true, })
                let ch = interaction.guild.channels.cache.get(channel)
                if (!ch) return msg.edit({ content: reply.NotFound.Reply4, ephemeral: true, allowedMentions: { repliedUser: false } })
                const message = interaction.fields.getTextInputValue("message")
                const msg_type = interaction.fields.getTextInputValue("type") || "embed"

                if(msg_type.toLowerCase() == "embed"){
                    const embed = new EmbedBuilder()
                    .setColor(interaction.guild.members.me.displayHexColor || `DarkButNotBlack`)
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setDescription(message)
    
                    ch.send({embeds: [embed] , components: [component] }).then(() => {
                        msg.edit({ content: reply.Selfrole.Reply4.replace("[CHANNEL]", ch), ephemeral: true, allowedMentions: { repliedUser: false } })
                    }).catch(() => {
                        msg.edit({ content: reply.Selfrole.Reply5, ephemeral: true, allowedMentions: { repliedUser: false } })
                    })
                }
                else{
                    ch.send({content: message , components: [component] }).then(() => {
                        msg.edit({ content: reply.Selfrole.Reply4.replace("[CHANNEL]", ch), ephemeral: true, allowedMentions: { repliedUser: false } })
                    }).catch(() => {
                        msg.edit({ content: reply.Selfrole.Reply5, ephemeral: true, allowedMentions: { repliedUser: false } })
                    })
                }
                interaction.message.delete().catch()
            }

            else {
                let msg = await interaction.reply({ content: reply.Selfrole.Reply6, ephemeral: true, })
                let ch = interaction.guild.channels.cache.get(channel)
                if (!ch) return msg.edit({ content: reply.NotFound.Reply4, ephemeral: true, allowedMentions: { repliedUser: false } })

                ch.send({ components: [component] }).then(() => {
                    msg.edit({ content: reply.Selfrole.Reply4.replace("[CHANNEL]", ch), ephemeral: true, allowedMentions: { repliedUser: false } })
                }).catch(() => {
                    msg.edit({ content: reply.Selfrole.Reply5, ephemeral: true, allowedMentions: { repliedUser: false } })
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