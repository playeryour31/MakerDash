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
        .setName('nickname')
        .setDescription('Changes the nickname of a member.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The member whose nickname will be changed')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('new-nick')
                .setDescription('The new nickname. اتركه فارغاً لحذف اللقب.')
                .setRequired(false)
        ),
    type: "System",
    botP: [PermissionFlagsBits.ManageNicknames],
    userP: [PermissionFlagsBits.ManageNicknames],
    P: "ManageNicknames",
    support: false,
    ownerOnly: false,
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async run(client, interaction, language, reply, replyEmbeds, name) {
         try {
            await interaction.deferReply({ ephemeral: false });
           
            const targetUser = interaction.options.getUser('user');
            const newNickname = interaction.options.getString('new-nick');
            const member = interaction.guild.members.cache.get(targetUser.id);
            
            if (!member) {
                return interaction.editReply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
            }

            if (
                interaction.member.roles.highest.position <= member.roles.highest.position &&
                interaction.guild.ownerId !== interaction.member.id
            ) {
                return interaction.editReply({ 
                    content: reply.System.SetNick1.replace("USER", targetUser.tag), 
                    ephemeral: true, 
                    allowedMentions: { repliedUser: false } 
                });
            }
            
            if (!newNickname) {
                await member.setNickname(null);
                return interaction.editReply({ 
                    content: reply.System.SetNick2.replace("USER", targetUser.tag), 
                    allowedMentions: { repliedUser: false } 
                });
            } else {
                await member.setNickname(newNickname);
                return interaction.editReply({ 
                    content: reply.System.SetNick3.replace("USER", targetUser.tag).replace("NICK", newNickname), 
                    allowedMentions: { repliedUser: false } 
                });
            }
        } catch (error) {
            console.error(error);
            return interaction.editReply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    },
};