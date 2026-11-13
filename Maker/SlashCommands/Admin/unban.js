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
const moment = require('moment-timezone');
const ms = require("ms");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Bans a member.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("User to unban.")
            .setRequired(true))
    ,
    type: "System",
    botP: [PermissionFlagsBits.BanMembers],
    userP: [PermissionFlagsBits.BanMembers],
    P: "BanMembers"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let user = interaction.options.getUser("user")


            if (user.id == interaction.user.id)
                return interaction
                    .reply({
                        content: reply.Others.Reply7.replace("[COMMAND]", "unban").replace("[AUTHOR]", interaction.user.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

                    const bannedUsers = await interaction.guild.bans.fetch();
                    const bannedUser = bannedUsers.find((u) => u.user.id === user.id);

                    if (!bannedUser) {
                        return interaction.reply({
                            embeds: [new EmbedBuilder().setDescription(reply.System.UnBan1.replace("[USER]", user.id)).setColor("Red")],
                            ephemeral: true,
                            allowedMentions: { repliedUser: false }
                          })
                      }
              
                      interaction.guild.members.unban(bannedUser.user).then((m) => {
                        interaction.reply({
                            content: reply.System.UnBan2.replace("[USER]", m.username),
                            allowedMentions: { repliedUser: false }
                          })
                      })
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};