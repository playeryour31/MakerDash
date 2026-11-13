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
    ChatInputCommandInteraction,
	ActivityType 
} = require("discord.js");
const { Database } = require("st.db")
const db = new Database("/Database/BotMaker/Status.json")
module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-status')
        .setDescription('Change the bot\'s status.')
        .addStringOption(option => option
            .setName('status')
            .setDescription('Type the status message')
            .setRequired(true))
        .addStringOption(option => option
            .setName('type')
            .setDescription('Choose the type of status')
            .addChoices(
                { name: 'Playing', value: 'PLAYING' },
                { name: 'Streaming', value: 'STREAMING' },
                { name: 'Listening', value: 'LISTENING' },
                { name: 'Watching', value: 'WATCHING' },
                { name: 'Competing', value: 'COMPETING' }
            )
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
            const status = interaction.options.getString("status");
            const type = interaction.options.getString("type");

            if (status.trim().length < 2) {
                return interaction.editReply({
                    content:  reply.Errors.Reply10,
                    ephemeral: true
                });
            }

            if (client.user.presence.activities.length > 0 && client.user.presence.activities[0].name === status) {
                return interaction.editReply({
                    content: reply.Errors.Reply9.replace("[STATUS]", status),
                    ephemeral: true
                });
            }

            const words = status.split(/\s+/);
            const uniqueWords = new Set(words);
            if (uniqueWords.size === 1 && words.length > 5) { 
                return interaction.editReply({
                    content: reply.Errors.Reply8,
                    ephemeral: true
                });
            }

            if (status.length > 100) {
                return interaction.editReply({
                    content: reply.Errors.Reply7,
                    ephemeral: true
                });
            }

            const validTypes = ['PLAYING', 'STREAMING', 'LISTENING', 'WATCHING', 'COMPETING'];
            if (!validTypes.includes(type)) {
                return interaction.editReply({
                    content: reply.Errors.Reply6,
                    ephemeral: true
                });
            }

            const activityTypeMap = {
                PLAYING: ActivityType.Playing,
                STREAMING: ActivityType.Streaming,
                LISTENING: ActivityType.Listening,
                WATCHING: ActivityType.Watching,
                COMPETING: ActivityType.Competing,
            };

            if (type === 'STREAMING') {
                const streamUrl = 'https://twitch.tv/discord';
                client.user.setPresence({
                    activities: [{ name: status, type: 1, url: streamUrl }],
                    status: 'online',
                    afk: false,
                });
                await db.set(client.user.id, {
                    Name: status,
                    Type: type,
                    Url: streamUrl,
                    Status: 'online',
                });
            } else {
                client.user.setPresence({
                    activities: [
                        {
                            name: status,
                            type: activityTypeMap[type],
                        },
                    ],
                    status: 'online',
                    afk: false,
                });
                await db.set(client.user.id, {
                    Name: status,
                    Type: type,
                    Status: 'online',
                });
            }

            interaction.editReply(`${reply.Owner.Reply3} ${type.toLowerCase()}: ${status}`);


        } catch (error) {
            console.log(error);
            return interaction.editReply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    },
};
