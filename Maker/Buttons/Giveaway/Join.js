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
} = require("discord.js");


const { Database } = require('st.db');
const db = require("../../lib/featureDb")("giveaway")

module.exports = {
    name: "giveaway",
    ownerOnly: false,
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            const messageID = interaction.message.id
            const data = db.get(`RunningGiveaway_${client.user.id}`)
            if (!data) return interaction.deferUpdate();
            const DB = data.filter(da => da.messageID === messageID);
            if (!DB) return interaction.deferUpdate();

            if (DB[0].Ended === "true") return interaction.reply({ content: `${reply.Giveaway.Reply11}`, ephemeral: true })

            const check = db.get(`${interaction.guild.id}_${interaction.message.id}_Members`) || []
            if (check && check.includes(interaction.user.id)) {
                const LeaveButton = new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setCustomId(`${interaction.message.id}_giveawayleave`)
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Leave Giveaway")
                        .setDisabled(false),
                ]);
                return interaction.reply({ content: `${reply.Giveaway.Reply12}`, components: [LeaveButton], ephemeral: true }).then(async (msg) => {
                    const collector = interaction.channel.createMessageComponentCollector({
                        filter: (i) => i.customId === `${interaction.message.id}_giveawayleave` && i.user.id === interaction.user.id,
                        time: 15000,
                        max: 1,
                    });
                    collector.on("collect", async (i) => {
                        const data1 = db.get(`RunningGiveaway_${client.user.id}`)
                        if (!data1) return interaction.deferUpdate();
                        const DB1 = data1.filter(da => da.messageID === messageID);
                        if (!DB1) return interaction.deferUpdate();
                        if (DB1[0].Ended === "true") return interaction.editReply({ content: `${reply.Giveaway.Reply11}`, components: [], ephemeral: true })

                        const check = db.get(`${interaction.guild.id}_${interaction.message.id}_Members`) || []
                        if (check && check.includes(interaction.user.id)) {
                            db.pull(`${interaction.guild.id}_${interaction.message.id}_Members`, interaction.user.id).then(async () => {
                                interaction.editReply({ content: `${reply.Giveaway.Reply13}`, components: [], ephemeral: true })
                                const check = db.get(`${interaction.guild.id}_${interaction.message.id}_Members`)
                                const messageID = interaction.message.id
                                const Message = await interaction.channel.messages.fetch(messageID)
                                const embedMessage = Message.embeds[0]
                                const updatedDes = embedMessage.description = embedMessage.description.replace(/Entries: \*\*\d+\*\*/, `Entries: **${check.length}**`);
                                const embed = new EmbedBuilder()
                                    .setTitle(embedMessage.title)
                                    .setColor(embedMessage.color)
                                    .setDescription(updatedDes)
                                Message.edit({ embeds: [embed] })
                            })
                        } else {
                            interaction.reply({ content: `${reply.Giveaway.Reply14}`, ephemeral: true })
                        }
                    });
                    collector.on("end", (collected) => {
                        if (collected.size === 0) {
                            if (msg) {
                                msg.delete().catch(error => { })
                            }
                        }
                    });

                })
            }
            
            if (DB[0].Role) {
                const role = DB.Role
                const hasRequiredRole = interaction.member.roles.cache.has(role);
                if (!hasRequiredRole) return interaction.reply({ content: `${reply.Giveaway.Reply15}`, ephemeral: true });
            }
            interaction.deferUpdate();
            db.push(`${interaction.guild.id}_${interaction.message.id}_Members`, interaction.user.id).then(async () => {
                const check = db.get(`${interaction.guild.id}_${interaction.message.id}_Members`)
                const embedMessage = interaction.message.embeds[0];
                const updatedDes = embedMessage.description = embedMessage.description.replace(/Entries: \*\*\d+\*\*/, `Entries: **${check.length}**`);
                const embed = new EmbedBuilder()
                    .setTitle(interaction.message.embeds[0].title)
                    .setColor(interaction.message.embeds[0].color)
                    .setDescription(updatedDes)
                interaction.message.edit({ embeds: [embed] })
            });
        } catch (error) {
            console.log(error)
              await interaction.reply({content: `${reply.Errors.Reply1}`, ephemeral: true})
        }
    }
}
