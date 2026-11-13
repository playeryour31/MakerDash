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
} = require("discord.js");


module.exports = {
    name: "d",
    ownerOnly: false,
    run: async (client, interaction, args, config) => {
        try {
const embed = new EmbedBuilder()
.setColor('#ffffff')
.setDescription(`### Ready-to-Buy Discord Bot Service  

### General Information  
- **Flexible Plans:** Affordable subscriptions tailored to all needs.  
- **Full Control:** Easy-to-use interface with professional features.  
- **Continuous Updates:** Regular improvements for the best user experience.  
- **High Stability:** Bots maintain 99.9% uptime without interruptions.  
- **24/7 Support:** Always available to resolve any issues.  
- **Unique Design:** Customized to suit all types of servers.  
- **Complete Security:** Full protection for your data and privacy.  
- **Fast Performance:** High-speed response for optimal bot operations.  
- **Customizable Settings:** Adjust the bot to match your requirements.  
- **Professional Experience:** Elevate your server above the rest.  

### Terms of Use  
- **Data Deletion:** Once the subscription expires, all bot data will be deleted, and the bot will be removed from your server. Renew before expiration to avoid this.  
- **Bot Availability:** Always check bot availability in the purchase menu before buying credits.  
- **No Refunds:** Bot purchases and activations are non-refundable.  
- **Subscription Renewal:** Renew your subscription before expiration. After expiration, the same bot cannot be renewed, and a new one must be purchased.  
- **Comprehensive Bot:** Includes essential features but does not cover all possible functionalities.  
- **Data Privacy:** All your bot data is securely stored on Volvo’s servers and will not be shared or sold.  
- **Prohibited Activities:** Exploiting or attempting to breach bots is strictly forbidden. Report any vulnerabilities immediately.  
- **Quality and Performance:** Bots deliver top-tier quality and fast response times for an exceptional experience.  
- **Closure Policy:** Volvo reserves the right to shut down any bot if terms of service are violated.  `)
        const button = new ButtonBuilder()
      			.setCustomId("ar")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("<:translate:1274013114786119832>");
            const row = new ActionRowBuilder().addComponents(button);

            interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } catch (error) {
            console.log(error);
        }
    },
};