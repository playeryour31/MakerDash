const {
    Client,
    Collection,
    Discord,
    createInvite,
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
        .setName('change-name')
        .setDescription('Change the bot\'s username.')
        .addStringOption(p => p
            .setName('name')
            .setDescription('Type the username')
            .setMaxLength(32)
            .setRequired(true))
    ,
    type: "Config",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: true,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        await interaction.deferReply({ ephemeral: false });
        try {
            const name = interaction.options.getString("name");

            if(name.length > 32){
                interaction.editReply(`${reply.Owner.Reply5}`);
            }

            await client.user.setUsername(name).then(()=>{
                interaction.editReply(`${reply.Owner.Reply2}`);
            })
        } catch (error) {
            console.log(error)
            return interaction.editReply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};