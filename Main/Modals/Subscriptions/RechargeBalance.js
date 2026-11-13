const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));
const BotMakerDB = new Database("./Database/BotMaker/Balance.json");

module.exports = {
    name: "recharge-modal",
    ownerOnly: false,
    run: async (client, interaction) => {
        try {
            const botid = interaction.customId.split("_")[1]?.trim(); 
			const balanceSchema = require('../../../Schema/Balance');
            const userBalance = await balanceSchema.findOne({
                userid: interaction.user.id,
                guild: interaction.guild.id,
            });
            const coins = userBalance?.balance || 0;

            if (coins === 0) {
                return interaction.reply({ content: 'You do not own any coins.', ephemeral: true });
            }

            const coinsToRecharge = parseInt(interaction.fields.getTextInputValue("coins_input"));

            if (isNaN(coinsToRecharge)) {
                return interaction.reply({ content: 'Please enter a valid number.', ephemeral: true });
            }

            if (coinsToRecharge > coins) {
                return interaction.reply({ content: 'You do not have enough coins.', ephemeral: true });
            }

            const rechargeAmount = coinsToRecharge;
            userBalance.balance -= coinsToRecharge;
            await userBalance.save();
            const data = BotMakerDB.get(`SubscriptionData_${botid}`) || { Balance: 0 };
            data.Balance += rechargeAmount;
            BotMakerDB.set(`SubscriptionData_${botid}`, data);
            await interaction.update({ 
                content: `Successfully recharged ${rechargeAmount} coins!`, 
				embeds: [],
				components: [],
                ephemeral: false 
            });

        } catch (error) {
            console.error(error);
            interaction.reply({ 
                content: `An error occurred while processing your request. Please try again later.`, 
                ephemeral: true 
            });
        }
    }
};