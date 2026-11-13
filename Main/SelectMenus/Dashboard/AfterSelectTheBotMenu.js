const {
    Client,
    Collection,
    Discord,
    createInvite,
    WebhookClient,
    PermissionsBitField,
    GatewayIntentBits,
    Partials,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    Events,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContextMenuCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder,
    ChatInputCommandInteraction
} = require("discord.js");

const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const config = require("../../Resources/Config.json");
const Colors = require("../../Resources/Colors.json");
const moment = require('moment-timezone');
const Tokens = new Database("/Database/Others/Tokens.json");
const BotMakerDB = new Database("/Database/BotMaker/Data");
const Lan = new Database("/Database/Others/Language.json");
const OwnerDB = new Database("/Database/Others/OwnerData");

module.exports = {
    name: "select-bots",
    description: "",
    usage: [""],
    botPermission: [""],
    authorPermission: [""],
    cooldowns: [0],
    ownerOnly: false,
    run: async (client, interaction, Text) => {
        try {
            let BotID = interaction.values[0];

            const bots = Tokens.get('Bots') || [];
const userBots = (bots || []).filter(bot => bot.ClientID === BotID);
const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
if (!isOwner) { 
    return interaction.reply({ 
        content: Text.NoPrem,
        ephemeral: true 
    });
}
            const userBota = bots.filter(bot => bot.ClientID === BotID);
            const bot = userBota[0];  

            const Type = bot.Type;   
            const Client = await client.users.fetch(bot.ClientID).catch(() => ({ username: `${bot.Type} #${bot.BotID}` }));

            const botEmbed = new EmbedBuilder()
                .setColor(Colors.Main)
                .setDescription(`## <:bot:1351994388737163375> ${Client.username} لوحه التحكم `)
    			.setThumbnail(Client.displayAvatarURL());
const menu = new StringSelectMenuBuilder()
    .setCustomId('select-action')
    .setPlaceholder('اختر إجراء للبوت')
    .addOptions([
        {
            label: 'إعدادات البوت',
            description: 'إعدادات البوت: اللغة، المالك، الإداريين، تشغيل/إيقاف.',
            value: `${BotID}_config`,
            emoji: '<:Settings:1393590003212488836>'
        },
        {
            label: 'إدارة الأوامر',
            description: 'إدارة الاختصارات، الرتب، وصلاحيات القنوات.',
            value: `${BotID}_manage-commands`,
            emoji: '<:List:1393589995012358235>'
        },
        {
            label: 'ربط خارجي',
            description: 'واجهة برمجة البوت لربط وإدارة البوت عبر لوحة تحكم مخصصة.',
            value: `${BotID}_Api`,
            emoji: '<:Api:1393590121424752671>'
        },
        {
           label: 'الصلاحيات',
           description: 'إدارة الصلاحيات في الاوامر واضافات وحذف صلاحيات استخدام.',
           value: `${BotID}_permissions`,
           emoji: '<:Lock:1393590062721007716>'
        },
        {
            label: 'أخرى',
            description: 'التحكم في وضع الخمول الصوتي والقائمة السوداء.',
            value: `${BotID}_others`,
            emoji: '<:Others:1393590014138650664>'
        },
    ]);
            const DashSelection = new ActionRowBuilder().addComponents(menu);

            await interaction.update({ embeds: [botEmbed], components: [DashSelection] });
        } catch (error) {
            console.log(error);
            await interaction.reply({ content: Text.Error });
        }
    }
};
