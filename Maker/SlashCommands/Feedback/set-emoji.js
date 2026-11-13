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
const db = require("../../lib/featureDb")("feedback")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-feedbackemoji')
        .setDescription('Change feedback emoji.')
        .addStringOption(emoji => emoji
            .setName("emoji")
            .setDescription("Put the new emoji.")
            )
    ,
    type: "Feedback",
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
            let emoji = interaction.options.getString("emoji")

            if(emoji){
                    db.set("FeedbackEmoji_" + interaction.guild.id + "_" + client.user.id, emoji).then(() => {
                        const done = new EmbedBuilder()
                            .setColor(`DarkButNotBlack`)
                            .setDescription(reply.Feedback.Reply7)
                        interaction.reply({ embeds: [done], allowedMentions: { repliedUser: false } })
                    })
            }else{
                let check = db.get("FeedbackEmoji_" + interaction.guild.id + "_" + client.user.id) || null
                if(!check){
                    return interaction.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
                }else{
                    db.delete("FeedbackEmoji_" + interaction.guild.id + "_" + client.user.id).then(() =>{
                        interaction.reply({ content: reply.Feedback.Reply8, allowedMentions: { repliedUser: false } })
                    })
                }
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};