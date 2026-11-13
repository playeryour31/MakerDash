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
const BlacksDB = new Database("/Database/BotMaker/Blacklisted.json");
const config = require("../../Resources/Config.json");
const Colors = require("../../Resources/Colors.json");
module.exports = {
    name: "blacklist-handler",
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            let id = interaction.customId.split("_")[2]?.trim();
            let action = interaction.customId.split("_")[1]?.trim();
            let user = interaction.fields.getTextInputValue("user");

            if (isNaN(user)) {
                return interaction.reply({ 
                    content: `**معرّف المستخدم غير صالح!**\nمثال: \`941085346886717480\``, 
                    ephemeral: true 
                });
            }

            let TheBot = await client.users.fetch(id).catch(() => id);
            let bots = Tokens.get('Bots') || [];
            let userBots = bots.filter(bot => bot.ClientID === id);

            if (action === "add") {
                if (BlacksDB.get(`${id}_${user}`)) { 
                    return interaction.reply({ 
                        content: `**هذا المستخدم مضاف بالفعل إلى القائمة السوداء!**`, 
                        ephemeral: true 
                    });
                }

                BlacksDB.set(`${id}_${user}`, true);
                return interaction.update({ 
                    embeds:[new EmbedBuilder().setDescription(`**تم إضافة المستخدم إلى القائمة السوداء بنجاح.**`).setColor(Colors.Main)], 
                    ephemeral: true 
                });

            } else if (action === "remove") {
                if (!BlacksDB.get(`${id}_${user}`)) { 
                    return interaction.reply({ 
                        content: `**هذا المستخدم غير موجود في القائمة السوداء!**`, 
                        ephemeral: true 
                    });
                }

                BlacksDB.delete(`${id}_${user}`);
                return interaction.update({ 
                    embeds:[new EmbedBuilder().setDescription(`**تمت إزالة المستخدم من القائمة السوداء بنجاح.**`).setColor(Colors.Main)], 
                    ephemeral: true 
                });
            }

        } catch (error) {
            console.error(error);
            return interaction.reply({ 
                content: `**حدث خطأ أثناء المعالجة. يرجى المحاولة لاحقًا.**`, 
                ephemeral: true 
            });
        }
    }
};
