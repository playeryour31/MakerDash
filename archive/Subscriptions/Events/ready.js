const { Client, Collection, Discord, createInvite, EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, ChannelType, ActivityType, WebhookClient, PermissionsBitField, GatewayIntentBits, Partials, ApplicationCommandType, ApplicationCommandOptionType, Events, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ContextMenuCommandBuilder, SlashCommandBuilder, REST, Routes, GatewayCloseCodes, messageLink, AttachmentBuilder } = require('discord.js');
const mongoose = require("mongoose")
const { Database } = require("st.db")
const statusDB = new Database('./Subscriptions/Database/Others/Status');

/**
 * 
 * @param {Client} client 
 */
module.exports.run = async (client) => {
    try {
        console.log(`\x1b[32mSubscriptions\x1b[0m - ${client.user.username} Online`)


const seatioesd = statusDB.get(client.user.id);

if (seatioesd) {
    if (seatioesd.Name && seatioesd.Type) {
        client.user.setPresence({
            activities: [
                {
                    name: seatioesd.Name,
                    type: ActivityType[seatioesd.Type], 
                }
            ],
            status: "online"
        });
    } else {
    return;
    }
}

    } catch (error) {
        console.log(error)
    }
};