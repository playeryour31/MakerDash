const { Client, Collection, Discord, createInvite, EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, ChannelType, ActivityType, WebhookClient, PermissionsBitField, GatewayIntentBits, Partials, ApplicationCommandType, ApplicationCommandOptionType, Events, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ContextMenuCommandBuilder, SlashCommandBuilder, REST, Routes, GatewayCloseCodes, messageLink, AttachmentBuilder } = require('discord.js');
const { Database } = require("st.db");
const { readdirSync } = require("fs");
const moment = require('moment-timezone');
let tokendb = new Database("./Database/Others/BotMakerTokens.json");
const rundb = new Database("./Database/BotMaker/RunBots.json");
const BotMakerDB = new Database("./Database/BotMaker/Data");
const fs = require('fs');
const path = require('path');
let config = require("../Main/Resources/Config.json");

if (!global.bots) global.bots = {};

setInterval(() => {
    try {
        let botsData = rundb.all();
        let tokens = tokendb.get("Subscriptions") || [];

        if (Array.isArray(botsData) && botsData.length > 0) {
            botsData.forEach(bot => {
                const botID = bot.ID;
                const shouldRun = bot.data;
                const tokenData = tokens.find(t => t.ClientID === botID);

                if (tokenData) {
                    if (shouldRun) {
                        if (!global.bots[botID]) {
                            const client = new Client({
                                intents: [
                                    GatewayIntentBits.DirectMessages,
                                    GatewayIntentBits.Guilds,
                                    GatewayIntentBits.GuildMessages,
                                    GatewayIntentBits.MessageContent,
                                    GatewayIntentBits.GuildMembers,
                                    GatewayIntentBits.AutoModerationExecution,
                                    GatewayIntentBits.AutoModerationConfiguration,
                                    GatewayIntentBits.DirectMessageReactions,
                                    GatewayIntentBits.DirectMessageTyping,
                                    GatewayIntentBits.GuildEmojisAndStickers,
                                    GatewayIntentBits.GuildIntegrations,
                                    GatewayIntentBits.GuildInvites,
                                    GatewayIntentBits.GuildMessageReactions,
                                    GatewayIntentBits.GuildMessageTyping,
                                    GatewayIntentBits.GuildModeration,
                                    GatewayIntentBits.GuildPresences,
                                    GatewayIntentBits.GuildScheduledEvents,
                                    GatewayIntentBits.GuildWebhooks,
                                    GatewayIntentBits.GuildVoiceStates,
                                ],
                                partials: [
                                    Partials.Channel,
                                    Partials.Message,
                                    Partials.User,
                                    Partials.GuildMember,
                                    Partials.Reaction,
                                    Partials.GuildScheduledEvent,
                                    Partials.ThreadMember,
                                ]
                            });
                    client.on('guildCreate', async (guild) => {
                        if (guild.id !== tokenData.MainGuild) {
                            await guild.leave();
                        }
                    });
                            client.login(tokenData.Token).catch((err) => {
                                console.error(`${tokenData.PurchasesID} not working: ${err.message}`);
                            });

                            client.on('error', (error) => {
                                console.error('An error occurred:', error);
                            });

                            client.on('shardError', (error) => {
                                console.error('A shard error occurred:', error);
                            });

                            client.on("ready", async () => {
                                const rest = new REST({ version: "10" }).setToken(tokenData.Token);
                                try {
                                    await rest.put(Routes.applicationCommands(tokenData.ClientID), {
                                        body: slashcommands,
                                    });
                                } catch (error) {
                                    console.error(error);
                                }
                            });

                            client.slashcommands = new Collection();
                            const slashcommands = [];
                            const commandFolders = fs
                                .readdirSync(path.join(__dirname, "SlashCommands"))
                                .filter((folder) => !folder.includes("."));
                            for (const folder of commandFolders) {
                                const commandFiles = fs
                                    .readdirSync(path.join(__dirname, "SlashCommands", folder))
                                    .filter((file) => file.endsWith(".js"));

                                for (const file of commandFiles) {
                                    const commandPath = path.join(__dirname, "SlashCommands", folder, file);
                                    const command = require(commandPath);

                                    if (command && command.data && command.data.name) {
                                        slashcommands.push(command.data);
                                        client.slashcommands.set(command.data.name, command);
                                    } else {
                                        console.error(`Error loading command at ${commandPath}`);
                                    }
                                }
                            }

                            client.button = new Collection();
                            require("./Handlers/Button")(client);

                            client.selectmenu = new Collection();
                            require("./Handlers/SelectMenus")(client);

                            client.modal = new Collection();
                            require("./Handlers/Modal")(client);

                            client.events = new Collection();
                            require("./Handlers/Events")(client);

                            global.bots[botID] = client;
                        }
                    } else {
                        if (global.bots[botID]) {
                            global.bots[botID].destroy();
                            delete global.bots[botID];
                            console.log(`\x1b[31mSubscriptions\x1b[0m - ${botID} Offline`);
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error("Error in bot manager:", error);
    }
}, 1000);