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


module.exports = {
    name: "continue-buy",
    ownerOnly: false,
        /**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 */
    run: async (client, interaction, args, config) => {
        try {
            let type = interaction.customId.split("_")[0]?.trim()
		let Embed = new EmbedBuilder().setDescription(`### قبل إتمام عملية الشراء يرجى اختيار أحد الخيارين التاليين:
-# - إنشاء بوت باستخدام التوكن الخاص بك وتوفير 50% من سعره (ستحتاج إلى توفير التوكن الخاص بك لإتمام العملية)
-# - إنشاء بوت باستخدام توكن جاهز من عندنا بسعره المعتاد (نقوم بإنشاء البوت لك مباشرة دون الحاجة لتوفير توكن))
-# تأكد من وضع توكن شغال وتحديد الخيارات الثلاث من [الموقع الرسمي](https://discord.com/developers/applications) لديسكورد.`)
                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(type + "_our_continue_")
                        .setStyle(ButtonStyle.Success)
                        .setLabel("توكن جاهز"),
                    new ButtonBuilder()
                        .setCustomId(type + "_his_continue_")
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel("توكن خاص بك")
                );
		await interaction.reply({ embeds: [Embed], components: [buttons], ephemeral: true }).then(async (msg) => {
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
            console.log(error)
        }
    }
}