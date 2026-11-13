const { Database } = require("st.db");
const moment = require("moment");

const LogsDate = new Database('./Subscriptions/Database/Others/Logger');
const IDsdb = new Database('./Subscriptions/Database/Others/IDs');

async function DatebaseLogger(client, Action, interaction, Amount, Credits) {
    try {
        const LogServerID = IDsdb.get(`LogID_${interaction.guild.id}`) || 1;

        let act;
        if (Action === "AddCoins") act = "Add Coins";
        else if (Action === "RemoveCoins") act = "Remove Coins";
        else if (Action === "BuyCoins") act = "Buy Coins";
        else if (Action === "TransferCoins") act = "Transfer Coins";
        else return;

        await LogsDate.push(`Logs_${client.user.id}_${interaction.guild.id}`, {
            User: interaction.user.id,
            ID: LogServerID,
            Amount,
			Credits,
            Action: act, 
            Time: moment().format("YYYY-MM-DD HH:mm"),
        });

        IDsdb.set(`LogID_${interaction.guild.id}`, LogServerID + 1);

    } catch (error) {
        console.error("Error in LogsCoinsToMain:", error);
    }
}

module.exports = { DatebaseLogger };
