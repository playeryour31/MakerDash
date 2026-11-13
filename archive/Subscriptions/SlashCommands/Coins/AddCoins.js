const moment = require("moment");
const {
    PermissionFlagsBits
} = require("discord.js");

const { Database } = require("st.db");
const logsdb = new Database("./Database/BotMaker/Logs.json");
const BotMakerDB = new Database("./Database/BotMaker/Balance.json");
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Manage coins')
        .addSubcommand(subcommand => 
            subcommand.setName('coins')
                .setDescription('Add coins to a user')
                .addUserOption(option => option.setName('user').setDescription('User to transfer coins to').setRequired(true))
                .addIntegerOption(option => option.setName('quantity').setDescription('Amount to transfer').setRequired(true))
        ),
    botP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: true,
    cooldown: 20000,
    
    async run(client, interaction, language, reply, embeds) {
        try {
            const balanceSchema = require('../../../Schema/Balance');

            const user = interaction.options.getUser('user')?.id;
            const amount = interaction.options.getInteger('quantity');

            if (!user || !amount) {
                return interaction.reply({ content: "Invalid user or amount.", ephemeral: true });
            }

            const data = BotMakerDB.get(`SubscriptionData_${client.user.id}`) || null;

            if (!data?.Balance || data.Balance < 0) {
                return interaction.reply({ content: "You can't add coins now. Try again later.", ephemeral: true });
            }

            let action = 'Added';
            let status = 'success';

            if (amount < 0) {
                action = 'Deducted';
                status = 'danger';
            }

            if (data.Balance < Math.abs(amount)) {
                return interaction.reply({ content: `You can add only ${data.Balance} coins for now.`, ephemeral: true });
            }

            data.Balance -= Math.abs(amount);
            BotMakerDB.set(`SubscriptionData_${client.user.id}`, data).then(async () => {
                let userdata = await balanceSchema.findOne({ userid: user, guild: interaction.guild.id });

                if (userdata) {
                    userdata.balance += amount;
                } else {
                    userdata = new balanceSchema({
                        userid: user,
                        guild: interaction.guild.id,
                        coins: amount,
                        balance: amount
                    });
                }

                userdata.save().then(() => {
                    let logId = logsdb.get(`LogID`) || 1;
                    logsdb.push(`Logs_${user}`, {
                        id: logId,
                        reason: "No reason provided",
                        amount: Math.abs(amount),
                        status: status,
                        action: action,
                        date: moment().format('YYYY-MM-DD hh:mm'),
                    }).then(() => {
                        logsdb.set(`LogID`, logId + 1);
                    });

                    interaction.reply({ content: `Successfully added ${amount} coins to <@!${user}>.`, ephemeral: false });

                }).catch(error => {
                    console.error("Error saving balance:", error);
                    interaction.reply({ content: "An error occurred while updating the user's balance.", ephemeral: true });
                });

            }).catch(error => {
                console.error("Error updating database:", error);
                interaction.reply({ content: "An error occurred while processing your request.", ephemeral: true });
            });

        } catch (error) {
            console.error("Error in command execution:", error);
            return interaction.reply({ content: "An unexpected error occurred. Please try again later.", ephemeral: true });
        }
    },
};
