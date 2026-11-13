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

module.exports = {
    name: "link",
    type: "Others",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
    * @param {Message} message
    */
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            let publicInviteUrl;

            if (message.guild.vanityURLCode) {
                publicInviteUrl = `${message.guild.vanityURLCode}` || null;
            } else {
                const invites = await message.guild.invites.fetch();
            }

            const privateInvite = await message.channel.createInvite({
                maxAge: 86400, 
                maxUses: 100, 
                unique: true,
            });

            try {
                await message.author.send(reply.Others.Link2 + `\n${privateInvite.url}`);
            } catch (error) {
                await message.reply({
                    content: reply.Others.Link2 + `\n${privateInvite.url}`,
                    allowedMentions: { repliedUser: false },
                });
                return;
            }

            if (publicInviteUrl) {
                await message.reply(reply.Others.Link1.replace("[Link]", publicInviteUrl));
            } else {
                await message.reply(reply.Others.Link3); 
            }

        } catch (error) {
            console.log(error);
            return message.reply({ embeds: [replyEmbeds.errorEmbed], allowedMentions: { repliedUser: false } });
        }
    }
};