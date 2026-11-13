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

const { Database } = require("st.db");
const db = require("../../lib/featureDb")("sys_log");

module.exports = {
    name: "LogSelector",
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

            interaction.deferUpdate();
            const check = db.get(`${Selected}_${interaction.guild.id}_${client.user.id}`) || null
            if (check) {
                const button = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(Selected + "_logdelete")
                            .setStyle(ButtonStyle.Danger)
                            .setLabel(reply.Log.Reply17),

                    );
                const channels = new ChannelSelectMenuBuilder()
                    .setCustomId(`${Selected}_loggingchannel`)
                    .setMaxValues(1)
                    .setChannelTypes(ChannelType.GuildText)
                const menu = new ActionRowBuilder().setComponents(channels)
                interaction.message.edit({ components: [menu, button] })

            } else {
                const channels = new ChannelSelectMenuBuilder()
                    .setCustomId(`${Selected}_loggingchannel`)
                    .setMaxValues(1)
                    .setChannelTypes(ChannelType.GuildText)

                const menu = new ActionRowBuilder().setComponents(channels)

                interaction.message.edit({ components: [menu] });
            }
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [embeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
}
