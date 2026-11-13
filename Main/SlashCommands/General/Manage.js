const { 
    Collection, 
    WebhookClient, 
    PermissionsBitField, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    EmbedBuilder 
} = require("discord.js");  
const { SlashCommandBuilder } = require("@discordjs/builders"); 
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));  

const Tokens = new Database("/Database/Others/Tokens.json");
const Colors = require("../../Resources/Colors.json");

module.exports = {  
    data: new SlashCommandBuilder()     
        .setName("manage")     
        .setDescription("Manage Your Bots")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to Manage')
        ),
        
    ownerOnly: false,  

    async run(client, interaction, Text) {
       const { Blacklist } = require("../../../Schema/Blacklist");
            const isBlacklisted = await Blacklist.findOne({ UserID: interaction.user.id });
            if (isBlacklisted) {
                return interaction.reply({
                    content: Text.Blacklist1,
                    ephemeral: true,
                });
            }

        const User = interaction.options.getUser('user') || interaction.user;

        if (User !== interaction.user && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: Text.NoPrem1, ephemeral: true });
        }

        const bots = Tokens.get('Bots') || [];
        const userBots = bots.filter(bot => bot.Owner === User.id);

        if (userBots.length === 0) {
            return interaction.reply({ content: Text.NoPrem2, ephemeral: true });
        }

        const botChunks = [];
        for (let i = 0; i < userBots.length; i += 7) {
            botChunks.push(userBots.slice(i, i + 7));
        }

        const actionRows = await Promise.all(
            botChunks.map(async (chunk, index) => {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId(`select-bots`)
                    .setPlaceholder('الرجاء اختيار خيار!')
                    .addOptions(
                        await Promise.all(
                            chunk.map(async bot => {
                                const Client = await client.users.fetch(bot.ClientID).catch(() => ({ username: `${bot.Type} #${bot.BotID}` }));
                                
                                return {
                                    label: `${Client.username}`,
                                    description: `${bot.Type}`,
                                    value: `${bot.ClientID}`,
                                };
                            })
                        )
                    );

                return new ActionRowBuilder().addComponents(menu);
            })
        );

const embed = new EmbedBuilder()
    .setColor(Colors.Main)
    .setDescription(`## إدارة بوتاتك
-# **اختر البوت الذي تريد إدارته من القائمة أدناه:**`)
    .setFooter({ text: `لديك ${userBots.length} بوت.` });


        const message = await interaction.reply({
            embeds: [embed],
            components: actionRows,
            ephemeral: false
        });
    },
};
