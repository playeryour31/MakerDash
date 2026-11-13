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
const { Database } = require("st.db")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Create a private invite link and send it to your DMs.')
    ,
    type: "Others",
    botP: [],
    userP: [],
    P: ""
    ,
    support: false,
    ownerOnly: false,
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async run(client, interaction, language, reply, replyEmbeds, name) {
            try {
            let publicInviteUrl;

            if (interaction.guild.vanityURLCode) {
                publicInviteUrl = `${interaction.guild.vanityURLCode}` || null;
            } else {
                const invites = await interaction.guild.invites.fetch();
            }

            const privateInvite = await interaction.channel.createInvite({
                maxAge: 86400,
                maxUses: 100, 
                unique: true,
            });
            try {
                await interaction.user.send(reply.Others.Link2 + `\n${privateInvite.url}`);
            } catch (error) {
                await interaction.reply({
                    content: reply.Others.Link2 + `\n${privateInvite.url}`,
                    ephemeral: true,
                });
                return;
            }
            if (publicInviteUrl) {
                await interaction.reply(reply.Others.Link1.replace("[Link]", publicInviteUrl));
            } else {
                await interaction.reply(reply.Others.Link3);
            }


        } catch (error) {
            console.log(error);
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    },
};