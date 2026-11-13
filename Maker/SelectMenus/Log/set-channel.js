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

const { Database } = require("st.db");
const db = require("../../lib/featureDb")("sys_log");

module.exports = {
    name: "loggingchannel",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @returns 
     */
    run: async (client, interaction, language, reply, name) => {
        try {
            const Selected = interaction.values[0];
            const event = interaction.customId.split("_")[0].trim()
            interaction.deferUpdate();
            const check = db.get(`${event}_${interaction.guild.id}_${client.user.id}`) || { channel: null , color: "Green" }
            db.set(`${event}_${interaction.guild.id}_${client.user.id}`,{
                channel: Selected,
                color: check.color
            }).then(() =>{
                const dataMenu = new ActionRowBuilder()
                .addComponents(
                  new StringSelectMenuBuilder()
                    .setCustomId(`LogSelector`)
                    .setPlaceholder('Select log event from here')
                    .addOptions(require("../../Utils/Logs/Logs.json").Logs)
                    .setMinValues(1)
                    .setMaxValues(1)
                );
              interaction.message.edit({ components: [dataMenu], allowedMentions: { repliedUser: false } })
            })
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [embeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
}
