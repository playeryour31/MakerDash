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
const { Database } = require("st.db")
const tokendb = new Database("/Database/Others/Tokens.json");

module.exports = {
    name: "time",
    type: "Config",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: true,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            const data = tokendb.get(`Bots`);
            if (!data.length) {
                return message.reply({ content: `${reply.Error.Reply1}`, ephemeral: true });
            }
            const DB = data.filter(da => da.ClientID === client.user.id);

            const endTime = new Date(DB[0].endTime);
            const currentTime = new Date();
    
            const time = endTime - currentTime;
    
            const daysLeft = Math.floor(time / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.floor((time % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
            message.reply({content: reply.Owner.Reply4.replace('[DAYS]', daysLeft).replace('[HOURS]', hoursLeft), allowedMentions: { repliedUser: false }});
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};