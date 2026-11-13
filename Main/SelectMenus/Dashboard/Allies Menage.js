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
const commandsdb = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Commands.json'));
let botbuildingdb = new Database('/Database/Others/Building.json');
let config = require("../../Resources/Config.json");
const OwnerDB = new Database("/Database/Others/OwnerData");
const Tokens = new Database("/Database/Others/Tokens.json");

module.exports = {
    name: "aliases-selector",
    description: "",
    usage: [""],
    botPermission: [""],
    authorPermission: [""],
    cooldowns: [0],
    ownerOnly: false,

    /**
     * Handles the interaction for alias selection.
     * @param {ChatInputCommandInteraction} interaction - The interaction object.
     */
    run: async (client, interaction) => {
        try {
            const bots = Tokens.get('Bots') || [];

            const Selected = interaction.values[0];
            let command = Selected.split("_")[0]?.trim();
            let action = Selected.split("_")[1]?.trim();
            let id = Selected.split("_")[2]?.trim();
            const userBots = (bots || []).filter(bot => bot.ClientID === id);
            const isOwner = userBots.length > 0 && userBots.some(bot => bot.Owner === interaction.user.id);
            if (!isOwner) { 
                return interaction.reply({ 
                    content: 'أنت لا تملك صلاحية إدارة هذا البوت.', 
                    ephemeral: true 
                });
            }
       let e;
         if (action == "Add") {
		e = "اضافه"
} else {
		e = "حذف"

}

            const modal = new ModalBuilder()
                .setCustomId(`modal-aliases_${command}_${id}_${action}`)
                .setTitle(`${e} أختصار للأمر ${command}`);

            const aliaseInput = new TextInputBuilder()
                .setCustomId('aliase')
                .setRequired(true)
                .setLabel(`اكتب أختصار لـ ${command}`)
                .setPlaceholder(`الأمر: ${command}`)
                .setStyle(TextInputStyle.Short);

            const aliasRow = new ActionRowBuilder().addComponents(aliaseInput);
            modal.addComponents(aliasRow);

            await interaction.showModal(modal);
        } catch (error) {
            console.error(error);
        }
    }
};
