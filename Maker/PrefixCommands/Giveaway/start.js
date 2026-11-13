const {
    Client,
    Collection,
    Discord,
    createInvite,
    ChannelType,
    WebhookClient,
    PermissionFlagsBits,
    GatewayIntentBits,
    Partials,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    Events,
    Message,
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
    PermissionOverwriteManager,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
} = require("discord.js");
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("giveaway")
const moment = require('moment-timezone');
const ms = require("ms");

module.exports = {
    name: "gstart",
    type: "Giveaway",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,
    /**
* @param {Message} message
*/
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            if (args.length < 1) {
                return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              }

              const time = args[0]
              const winners = args[1]
              const prize = args.slice(2).join(" ");

              if (!time && !winners && !prize) return message.reply({embeds: [replyEmbeds.usageEmbed]})

              const hasTimeUnit = /[mdhs]/i.test(time);
              if (!hasTimeUnit) return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              if (isNaN(winners)) return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              if (!prize) return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              const remainingTimeSeconds = ms(time) / 1000;
        
              const startTime = moment().format('YYYY-MM-DD HH:mm:ss');
              const endTimemomet = moment().add(remainingTimeSeconds, 'seconds').format('YYYY-MM-DD HH:mm:ss');

              const giveawayEmbed = new EmbedBuilder()
              .setColor(message.guild.members.me.displayHexColor)
              .setTitle(`${prize}`)
              .setDescription(`Ends: <t:${Math.floor((Date.now() + ms(time)) / 1000)}:R>  (<t:${Math.floor((Date.now() + ms(time)) / 1000)}:f>)\nHosted by: ${message.author}\nEntries: **0**\nWinners: **${winners}**`);
      
            const emoji = db.get(`gemoji_${message.guild.id}`) || "🎉"
      
            const GiveawayButton = new ActionRowBuilder().addComponents([
              new ButtonBuilder()
                .setCustomId(`giveaway`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(`${emoji}`)
                .setDisabled(false),
            ]);

            message.channel.send({ embeds: [giveawayEmbed], components: [GiveawayButton] }).then(async (msg) => {
                message.delete()
                await db.push(`RunningGiveaway_${client.user.id}`, {
                  Time: endTimemomet,
                  RealEndsTime: endTimemomet,
                  StartedTime: startTime,
                  messageID: msg.id,
                  Status: "true",
                  channelID: message.channel.id,
                  guild: message.guild.id,
                  Winners: winners,
                  Reroll: [],
                  winner: "null",
                  Pause: "false",
                  Started: "false",
                  Channel: message.channel.id,
                  Prize: prize,
                  Ended: "false"
                })
              });

        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};