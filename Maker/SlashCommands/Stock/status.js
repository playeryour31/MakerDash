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
const { Database } = require("st.db");
const db = require("../../lib/featureDb")("stock_db");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Enable or disable the selling system.')
        .addStringOption(option => 
            option.setName("mode")
                .setDescription("Turn the selling system ON or OFF.")
                .setRequired(true)
                .addChoices(
                    { name: 'On', value: "on" },
                    { name: 'Off', value: "off" }
                )),
    type: "Stock",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    support: false,
    ownerOnly: true,

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async run(client, interaction, language, reply, replyEmbeds) {
 try {
        const mode = interaction.options.getString("mode");
       if (mode === "on") { 
                db.set(`Status_${interaction.guild.id}_${client.user.id}`, true); 
       } else { 
                 db.set(`Status_${interaction.guild.id}_${client.user.id}`, false); 

  }
    const displayStatus = language === "Ar"
      ? (mode === "on" ? "شغال" : "موقف")
      : (mode === "on" ? "On" : "Off");


                interaction.reply({
                    content: reply.Stock.Reply32.replace("[Status]", displayStatus),
                    ephemeral: false,
                });
       } catch (error) {
            console.error(error);
            interaction.reply({
                embeds: [replyEmbeds.errorEmbed],
                ephemeral: true,
                allowedMentions: { repliedUser: false },
            });
        }
    },
};
