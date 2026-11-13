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
const isImageUrl = require('is-image-url');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-feedbackline')
        .setDescription('Set/Change feedback line.')
        .addStringOption(line => line
            .setName("line")
            .setDescription("Put your line image url.")
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
            let line = interaction.options.getString("line")

            if(line){
                if (!isImageUrl(line)) {
                    return interaction.reply({ content: reply.Others.Reply1, allowedMentions: { repliedUser: false } });
                }
                db.set("FeedbackLine_" + interaction.guild.id + "_" + client.user.id, line).then(() => {
                    const done = new EmbedBuilder()
                        .setColor(`DarkButNotBlack`)
                        .setDescription(reply.Feedback.Reply5)
                        .setImage(line);
                    interaction.reply({ embeds: [done], allowedMentions: { repliedUser: false } })
                })
            }else{
                let check = db.get("FeedbackLine_" + interaction.guild.id + "_" + client.user.id) || null
                if(!check){
                    return interaction.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
                }else{
                    db.delete("FeedbackLine_" + interaction.guild.id + "_" + client.user.id).then(() =>{
                        interaction.reply({ content: reply.Feedback.Reply6, allowedMentions: { repliedUser: false } })
                    })
                }
            }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};