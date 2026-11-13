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
const db = require("../../lib/featureDb")("broadcast")

module.exports = {
    name: "setmessages",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            
                const messageId = interaction.customId.split('_')[1];
                const userMessage = interaction.fields.getTextInputValue(`message_${messageId}`);
  			    const serverId = interaction.guild.id; 
                const userId = interaction.user.id;
  			    const channel = interaction.channel;
         	    const messageToEdit = await channel.messages.fetch(messageId);
 


                  const broadcastData = db.get(`broadcast_${serverId}`) || [];
           broadcastData.push({
                messageId: messageId,
                userId: userId,
                content: userMessage,
                timestamp: new Date(),
            });
            db.set(`broadcast_${serverId}`, broadcastData);
if (!messageToEdit) {
                return ;
}


if (messageToEdit) {
    const embed = new EmbedBuilder()
        .setColor(interaction.guild.members.me.displayHexColor)
        .setTitle('📢 Broadcast Panel')
        .setDescription('Welcome to the **Broadcast Panel**! Here you can efficiently manage your broadcasts and announcements.')
        .addFields(
            { name: 'Current Message', value: `\`\`\`${userMessage}\`\`\``, inline: false },
            { name: 'Instructions', value: `<@!${client.user.id}>` } 
        )
        .setFooter({ text: 'Powered by Your VolvoTeam - Bringing Your Community Together!' })
        .setTimestamp();

    await messageToEdit.edit({ embeds: [embed] }); 
}

            const embed = new EmbedBuilder()
                .setColor('GREEN')
                .setTitle('✅ Message Set Successfully!')
                .setDescription(`Your message has been successfully set!\n**Content:** ${userMessage}`)
                .setFooter({ text: `Broadcast set in server: ${interaction.guild.name}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

                  console.log(`User set message for ID ${messageId}: ${userMessage}`);
				
        } catch (error) {
            console.log(error)
            console.log(error.stock)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } }).catch(() => {
                return interaction.channel.send({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
            })
        }
    }
}