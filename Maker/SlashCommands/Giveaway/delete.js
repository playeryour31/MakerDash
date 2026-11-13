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
const db = require("../../lib/featureDb")("giveaway")
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gdelete')
    	.setDescription('Delete and end an active giveaway.')
        .addStringOption(id => id
            .setName("message_id")
            .setDescription("Put the giveaway id.")
            .setRequired(true))
    ,
    type: "Giveaway",
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
            const ID = interaction.options.getString("message_id")

            if (isNaN(ID)) return interaction.reply({ embeds: [replyEmbeds.usageEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
            let endcheck = db.get(`${ID}_Data`) || null
            if (endcheck) return interaction.reply({ content: `${reply.Giveaway.Reply1}`, ephemeral: true, allowedMentions: { repliedUser: false }});
            const data = db.get(`RunningGiveaway_${client.user.id}`)
            if (!data.length) return interaction.reply({ content: `${reply.Giveaway.Reply2}`, ephemeral: true, allowedMentions: { repliedUser: false } });
            const DB = data.filter(da => da.messageID === ID);
            if (!DB) return interaction.reply({ content: `${reply.Giveaway.Reply2}`, ephemeral: true, allowedMentions: { repliedUser: false } });
      
            const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
      
            DB[0].Time = currentTime
      
            db.set(`RunningGiveaway_${client.user.id}`, data).then(async () => {
                interaction.reply({content: reply.Giveaway.Reply8, ephemeral: true, allowedMentions: { repliedUser: false }});

                try {
                    const channel = await client.channels.fetch(DB[0].channelID);
                    const message = await channel.messages.fetch(ID);
                    if (message) await message.delete();
                } catch (err) {
                    console.error("Failed to delete giveaway message:", err);
                }
            });
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};