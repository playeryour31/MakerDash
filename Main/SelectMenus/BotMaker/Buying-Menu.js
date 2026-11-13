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
const bots = require("../../Resources/Bots.json");
const commandsdb = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Commands.json'))
const botbuildingdb = new Database('/Database/Others/Building.json')
const Description = require("../../../Maker/Resources/LanguagsProvider.json").Ar.Help;

module.exports = {
    name: "buying-menu",
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
            // Ack within 3s — avoids DiscordAPIError 10062 Unknown interaction
            await interaction.deferReply({ ephemeral: true });

            setTimeout(() => {
                    interaction.message.edit({ components: [interaction.message.components[0],interaction.message.components[1]] }).catch(() => {});
            }, 500);

            const { Blacklist } = require("../../../Schema/Blacklist");
            const isBlacklisted = await Blacklist.findOne({ UserID: interaction.user.id });
            if (isBlacklisted) {
                return interaction.editReply({
                    content: Text.Blacklist1,
                });
            }
            const Selected = interaction.values[0];

            if (Selected === "buy") {
                const seenTypes = new Set();
                const botOptions = Object.values(bots)
                    .filter((bot) => {
                        if (!bot?.type || bot.purchaseStatus === false) return false;
                        const type = String(bot.type);
                        if (seenTypes.has(type)) return false;
                        seenTypes.add(type);
                        return true;
                    })
                    .map((bot) => ({
                        label: "بوت " + bot.name,
                        value: bot.type + "_Selected",
                        description: bot.descriptionSmall,
                        emoji: bot.emoji,
                    }));

                if (botOptions.length === 0) {
                    return interaction.editReply({
                        content: "لا توجد بوتات متاحة للشراء حالياً.",
                    });
                }

                const dropMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("buybot-Selector")
                        .setPlaceholder("اختر بوتًا احترافيًا لشرائه!")
                        .addOptions(botOptions)
                );

                return interaction.editReply({ components: [dropMenu] });

            } else if (Selected === "build") {
                
                let commands = commandsdb.all().filter(data => data.ID.includes('command') && data.data.name);
                commands.sort((a, b) => {
                    const typeA = a.data.type.toLowerCase();
                    const typeB = b.data.type.toLowerCase();
                    return typeA.localeCompare(typeB);
                });

                botbuildingdb.delete(`buildBot_${interaction.user.id}`);

                let menus = [];
                const chunkSize = 25;

                for (let i = 0; i < commands.length; i += chunkSize) {
                    const chunk = commands.slice(i, i + chunkSize);

                    const options = chunk.map(com => ({
                        label: `${com.data.name}`,
                        value: `${com.data.type}_${com.ID}_1000000`,
                        description: Description[com.data.name] || "No description.",
                    }));

                    const dropMenu = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(i + "_" + "select-commands")
                            .setPlaceholder("اختر أوامر البوت الخاص بك!")
                            .addOptions(options)
                    );

                    menus.push(dropMenu);
                }

                return interaction.editReply({ components: menus });

            }

        } catch (error) {
            console.log("Error in buying-menu:", error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: "حدث خطأ، حاول مرة أخرى." }).catch(() => {});
            }
        }
    }
};
