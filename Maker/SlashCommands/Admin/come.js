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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('come')
        .setDescription('request someone to come to the channel.')
        .addUserOption(user => user
            .setName("user")
            .setDescription("user to request.")
            .setRequired(true))
    ,
    type: "System",
    botP: [],
    userP: [PermissionFlagsBits.ManageMessages],
    P: "ManageMessages",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            let user = interaction.options.getUser("user")
            const member = interaction.guild.members.cache.get(user.id);
            if (!member) return interaction.reply({ content: reply.NotFound.Reply2, ephemeral: true, allowedMentions: { repliedUser: false } })
            

            if (member.id == interaction.member.id)
                return interaction.reply({
                    content: reply.Others.Reply7.replace("[COMMAND]", name).replace("[AUTHOR]", interaction.user.username),
                    ephemeral: true,
                })

                let button = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                      .setStyle(ButtonStyle.Link)
                      .setLabel("Requested channel")
                      .setURL(interaction.channel.url)
                  );
              
                  let embed = new EmbedBuilder()
                    .setDescription(
                      `${reply.System.Come1.replace("[USER]", member).replace("[AUTHOR]", interaction.user).replace("[ROOM]", interaction.channel)}`
                    )
                    .setColor(interaction.guild.members.me.displayColor);
        

                    await member.send({ embeds: [embed], components: [button] }).then(() => {
                      interaction.reply(reply.System.Come2.replace("[USER]", member.user.username));}).catch(() => {
                      interaction.reply(reply.System.Come3.replace("[USER]", member.user.username));
                    }) 
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};