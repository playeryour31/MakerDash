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
const coinsDB = new Database("/Database/BotMaker/Balance.json");
const priceDB = new Database("/Database/BotMaker/Prices.json");
let Config = require("../../Resources/Config.json");
let Colors = require("../../Resources/Colors.json");
const bots = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Bots.json'));

module.exports = {
    name: "buybot-Selector",
    description: "",
    usage: [""],
    botPermission: [""],
    authorPermission: [""],
    cooldowns: [0],
    ownerOnly: false,
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction, Text) => {
        try {
                                                                               
setTimeout(() => {
    interaction.message.edit({ components: [interaction.message.components[0],interaction.message.components[1]] }).catch(() => {});
            }, 500)
            const { Blacklist } = require("../../../Schema/Blacklist");
            const isBlacklisted = await Blacklist.findOne({ UserID: interaction.user.id });
            if (isBlacklisted) {
                return interaction.reply({
                    content: Text.Blacklist1,
                    ephemeral: true,
                });
            }

            const balanceSchema = require('../../../Schema/Balance');
            const Selected = interaction.values[0].split("_")[0].trim();
            const bot = bots.get(Selected);

            if (!bot) {
                const embed = new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setDescription(Text.NotFound1);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (!bot.purchaseStatus) {
                const embed = new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(Text.NotFound2.replace("[Bot]", bot.name ));
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            let userdata = await balanceSchema.findOne({ userid: interaction.user.id, guild: interaction.guild.id });
            let usercoins = userdata?.balance || 0;
            const botPrice = priceDB.get(`${bot.priceKey}_${interaction.guild.id}`) || 1;


            const embed = new EmbedBuilder()
                .setColor(Colors.Main)
                .setThumbnail('https://cdn.discordapp.com/attachments/1247276053181890662/1293712578635370518/credit-card.1024x960.png?ex=67085f3a&is=67070dba&hm=194c123784e29942bf097826e051b13c38e03c85270bc7e0fbaf760d2bb8cf24&')
                .setDescription(`
## شراء بوت ${bot.name} 
> ${bot.descriptionLarge}

> -# سعر البوت: **[ __${botPrice}__ ]**
                `);

            const button = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${Selected}_continue-buy`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("<:signcheck:1293713968266874952>"),
                    new ButtonBuilder()
                        .setCustomId("cancel")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("<:signdelete:1293713971945144493>")
                );

            interaction.reply({ embeds: [embed], components: [button], ephemeral: true }).then(async (msg) => {
                const collector = interaction.channel.createMessageComponentCollector({
                    filter: (i) => i.user.id === interaction.user.id,
                    time: 30000,
                    max: 1,
                });

                collector.on("collect", async (i) => {
                    await msg.delete().catch(error => console.log("Error deleting message: ", error));
                });

                collector.on("end", (collected) => {
                    if (collected.size === 0) {
                        msg.delete().catch(error => console.log("Error deleting message: ", error));
                    }
                });
            });


        } catch (error) {
            console.log("An error occurred: ", error);
            interaction.reply({ content: Text.Error, ephemeral: true });
        }
    }
};
