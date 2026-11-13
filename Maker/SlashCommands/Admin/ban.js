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
        .setName('ban')
        .setDescription('Bans a member.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("User to ban.")
            .setRequired(true))
        .addStringOption(time => time
            .setName("time")
            .setDescription("Time duration for the ban."))
        .addStringOption(reason => reason
            .setName("reason")
            .setDescription("The reason of the ban"))
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
            let time = interaction.options.getString("time") || '90d'
            let reason = interaction.options.getString("reason")

            let TimeCC = ms(time) / 1000;
            if (isNaN(TimeCC)) time = '90d'

            const member = interaction.guild.members.cache.get(user.id);

            if (member.id == interaction.user.id)
                return interaction
                    .reply({
                        content: reply.Others.Reply7.replace("[COMMAND]", "ban").replace("[AUTHOR]", interaction.user.username),
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            if (!member && !user.id.match(/^\d+$/))
                return interaction
                    .reply({
                        content: reply.NotFound.Reply2,
                        ephemeral: true,
                        allowedMentions: { repliedUser: false }
                    })

            if (interaction.member.roles.highest.position <= member?.roles?.highest?.position)
                return interaction
                    .reply({
                        content: reply.Others.Reply7.replace("[COMMAND]", "ban").replace("[AUTHOR]", member.user.username),
                        ephemeral: true,
                    })


                    if (user.id.match(/^\d+$/)) {
                        try {
                          const endTime = moment().add(time, 'seconds').format('YYYY-MM-DD HH:mm:ss');
                          await interaction.guild.members.ban(user, { reason: "By: "+ interaction.user.username + ","+ "Reason: " + reason +  "Ends On:" + endTime});
                          return interaction.reply({
                              content: reply.System.Ban1.replace("[USER]", member?.user?.username ?? member?.username ?? "user"),
                              allowedMentions: { repliedUser: false }
                            })
                        } catch (error) {
                          console.log(error);
                          return interaction.reply({ embeds: [replyEmbeds.notFoundEmbed], ephemeral:true, allowedMentions: { repliedUser: false } })
                        }
                      } else {
                        if (member.id === interaction.member.id)
                        return interaction.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
                
                
                        if (
                          interaction.member.roles.highest.position <=
                          member.roles.highest.position
                        )
                        return interaction.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
                
                
                        if (!member.bannable)
                        return interaction.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
                        try {
                          await member.ban({ reason: "By: "+ interaction.user.username + ","+ "REASON: " + reason +  "ENDS ON:" + endTime});
                          return interaction
                            .reply({
                              content: reply.System.Ban1.replace("[USER]", member.user.username),
                              allowedMentions: { repliedUser: false }
                            })
                        } catch (error) {
                          console.log(error);
                          return interaction.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
                        }
                      }
                      
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};