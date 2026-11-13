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
    name: "come",
    type: "System",
    botP: [],
    userP: [PermissionFlagsBits.ManageMessages],
    P: "ManageMessages",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!args[0]) return message.reply({ content: reply.Others.Reply4, allowedMentions: { repliedUser: false } })
            if (!member) return message.reply({ content: reply.NotFound.Reply2, allowedMentions: { repliedUser: false } })

            if (member.id == message.member.id)
            return message
              .reply({
                content: reply.Others.Reply7.replace("[COMMAND]", name).replace("[AUTHOR]", message.author.username),
                ephemeral: true,
              })
      
          let button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel("Requested message")
              .setURL(message.url)
          );
      
          let embed = new EmbedBuilder()
            .setDescription(
              `${reply.System.Come1.replace("[USER]", member).replace("[AUTHOR]", message.author).replace("[ROOM]", message.channel)}`
            )
            .setColor(message.guild.members.me.displayColor);

            member.send({ embeds: [embed], components: [button] }).then(() => {
              message.reply(reply.System.Come2.replace("[USER]", member.user.username));}).catch(() => {
              message.reply(reply.System.Come3.replace("[USER]", member.user.username));
            }) 
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};