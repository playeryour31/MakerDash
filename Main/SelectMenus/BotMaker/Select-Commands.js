const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
} = require("discord.js");

const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const commandsdb = require(require('path').join(process.cwd(), 'src/shared/services/mainDb/staticCatalog')).fromRequire(require('path').join(process.cwd(), 'Main/Resources/Commands.json'));
const botbuildingdb = new Database('/Database/Others/Building.json');
const Config = require("../../Resources/Config.json");
const Colors = require("../../Resources/Colors.json");
const Description = require("../../../Maker/Resources/LanguagsProvider.json").Ar.Help;
module.exports = {
    name: "select-commands",
    run: async (client, interaction) => {
        try {
            await interaction.deferUpdate().catch(() => {});

            const Selected = interaction.values[0];
            const [type, commandID, price] = Selected.split("_").map(v => v.trim());
            const command = commandsdb.get(commandID);
            const commandsEmbed = interaction.message?.embeds?.[0];

            let check = botbuildingdb.get(`buildBot_${interaction.user.id}`) || [];

            if (!check.includes(commandID)) {
                botbuildingdb.push(`buildBot_${interaction.user.id}`, commandID);
                check.push(commandID);
            }

            let commands = commandsdb.all().filter(data =>
                data.ID.includes("command") &&
                data.data.name &&
                !check.includes(data.ID)
            );
commands.sort((a, b) => {
    const typeA = a.data.type.toLowerCase();
    const typeB = b.data.type.toLowerCase();
    if (typeA < typeB) return -1;
    if (typeA > typeB) return 1;
    return 0;
});
            let menus = [];
            let chunkSize = 25;

            for (let x = 0; x < commands.length; x += chunkSize) {
                let chunk = commands.slice(x, x + chunkSize);
                let options = [];

                chunk.forEach(com => {
                    if (com && com.data && com.ID) {
                        options.push({
                            label: `${com.data.name}`,
                            value: `${com.data.type}_${com.ID}_1000000`,
                            description: Description[com.data.name],
                        });
                    }
                });

                if (options.length > 0) {
                    const dropMenu = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`${x}_select-commands`)
                            .setPlaceholder("حدد أوامر الروبوت الخاص بك من هنا!")
                            .setOptions(options)
                    );
                    menus.push(dropMenu);
                }
            }
const components = [...menus];

            let embed;
            if (!commandsEmbed) {
                embed = new EmbedBuilder()
                    .setColor(Colors.Main)
                    .setDescription(`## بناء بوت مخصص\n-# **${command.name}** (${price || "1000000"}$)`)
                    .addFields({ name: ' ', value: `-# المجموع: **${price}**` });
            } else {
                let botTypes = commandsdb.all()
                    .filter(data => !data.ID.includes("command") && !data.ID.includes("config"))
                    .map(data => data.ID);
                let locked = false;

                botTypes.forEach(bot => {
                    let bots = commandsdb.get(bot);
                    if (bots && check.length === bots.length) {
                        const sortedCheck = [...check].sort();
                        const sortedBots = [...bots].sort();
                        const arraysMatch = sortedCheck.every((val, idx) => val === sortedBots[idx]);
                        if (arraysMatch) locked = true;
                    }
                });
                const currentTotal = parseInt(
                    interaction.message.embeds[0].fields[0].value.match(/\*\*(.*?)\*\*/)?.[1] || "0"
                );
                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("cancel_purchase")
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Cancel"),
                    new ButtonBuilder()
                        .setCustomId("Custom_continue-buy_" + currentTotal + parseInt(price))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(locked)
                        .setLabel("Build It")
                );


if (components.length < 5) {
    components.push(buttons); 
}

                embed = new EmbedBuilder()
                    .setColor(Colors.Main)
                    .setDescription(`${interaction.message.embeds[0].description}\n-# **${command.name}** (${price || "1000000"}$)`)
                    .addFields({ name: ' ', value: `-# المجموع: **${currentTotal + parseInt(price)}**` });
            }

await interaction.editReply({ embeds: [embed], components: components, ephemeral: true }).then(async (msg) => {
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
            console.error("Error in select-commands:", error);
        }
    }
};
