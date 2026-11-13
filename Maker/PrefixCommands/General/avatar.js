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
} = require("discord.js");

module.exports = {
    name: "avatar",
    type: "General",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            let member = message.mentions.members.first() || message.guild.members.cache.get(args[1]) || message.member


            const avatar = member.displayAvatarURL({ size: 1024, dynamic: true });
            const button = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("Download")
                .setURL(avatar)
            );
            
            const embed = new EmbedBuilder()
              .setAuthor({name:member.user.username,iconURL: member.user.displayAvatarURL({ dynamic: true })})
              .setTitle("Avatar Link")
              .setURL(avatar)
              .setImage(avatar)
              .setColor(message.guild.members.me.displayColor)
              .setFooter({text:`Requested by ${message.author.username}`,iconURL:message.author.displayAvatarURL({ dynamic: true })});
        
              message.reply({ embeds: [embed], components: [button], allowedMentions: { repliedUser: false } });
      
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};