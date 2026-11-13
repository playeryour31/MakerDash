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

module.exports = {
    name: "users-limits",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
                      const limit = interaction.values[0];
                      const channel = interaction.customId.split("_")[2].trim()
					  const voiceChannel = await interaction.guild.channels.fetch(channel);
            if (!voiceChannel) {
                return interaction.reply({
                    content: reply.TempVoice.Reply26,
                    ephemeral: true,
                });
            }
							
                      const userLimit = parseInt(limit);
           			 await voiceChannel.edit({ userLimit });
		   await interaction.update({
                content: reply.TempVoice.Reply27.replace("[LIMIT]", userLimit),
                ephemeral: true,
                components: []

            });
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
}
