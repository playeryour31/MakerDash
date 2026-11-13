const {
    Client,
    Collection,
    Discord,
    createInvite,
    ChannelType,
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
    SlashCommandBuilder,
    REST,
    Routes,
    GatewayCloseCodes,
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    Embed,
    ChatInputCommandInteraction
} = require("discord.js");

const moment = require('moment-timezone');
moment.tz.setDefault('Africa/Cairo');

const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const aliasesdb = new Database('/Database/Others/Aliases.json');
const Tokens = new Database("/Database/Others/Tokens.json");
const Prices = new Database("/Database/BotMaker/Prices.json");
const coinsDB = new Database("/Database/BotMaker/Balance.json");
const VoicesDB = new Database("/Database/Others/Voices.json");
const config = require("../../Resources/Config.json");
const Colors = require("../../Resources/Colors.json");
module.exports = {
    name: "voicePin",
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            let id = interaction.customId.split("_")[0]?.trim();
            let voice = interaction.fields.getTextInputValue("voice");

            if (isNaN(voice)) {
                return interaction.reply({ 
                    content: `**معرف المستخدم غير صالح!**\nمثال: \`1203560746638647316\``, 
                    ephemeral: true 
                });
            }

            VoicesDB.set(`Voice_${id}`, voice);

            return interaction.update({ 
                embeds: [new EmbedBuilder()
                    .setColor(Colors.Main)
                    .setDescription(`**<:signcheck:1293713968266874952> تم تعيين غرفة الصوت وحفظ القناة بنجاح.**`)], 
                components: [] 
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({ 
                content: `**حدث خطأ أثناء المعالجة. يرجى المحاولة مرة أخرى لاحقًا.**`, 
                ephemeral: true 
            });
        }
    }
};
