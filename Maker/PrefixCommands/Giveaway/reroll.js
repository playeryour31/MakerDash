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
const _ = require('lodash');

module.exports = {
    name: "greroll",
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

              const ID = args[0]
              const winners = args[1]

              if(!ID && !winners) return message.reply({ embeds: [replyEmbeds.usageEmbed], allowedMentions: { repliedUser: false } })
              if (isNaN(ID) || isNaN(winners)) return message.reply({ embeds: [replyEmbeds.usageEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })


              let endcheck = db.get(`${ID}_Data`) || null
              const data = db.get(`RunningGiveaway_${client.user.id}`)
              if (!data.length && !endcheck) return message.reply({ content: `${reply.Giveaway.Reply2}`, ephemeral: true });
              const DB = data.filter(da => da.messageID === ID);
              if (!DB) return message.reply({ content: `${reply.Giveaway.Reply2}`, ephemeral: true });
              if (!endcheck) return message.reply({ content: `${reply.Giveaway.Reply3}`, ephemeral: true });
      
      
              const channel = await client.channels.cache.get(endcheck.channelID)
              const Prize = endcheck.Prize;
              const participants = db.get(`${message.guild.id}_${ID}_Members`);
              const winnersCount = parseInt(winners);
              const newWinners = _.sampleSize(_.difference(participants, endcheck.Winner, endcheck.Reroll), Math.min(winnersCount, participants?.length));
              endcheck.Reroll = [...endcheck.Reroll, ...newWinners];
              db.set(`${ID}_Data`, endcheck);
              const newWinner = newWinners.map(winner => `<@!${winner}>`).join(", ");
              const giveawaymessage = await channel.messages.fetch(ID);
      
      
              if (newWinner) {
                  message.reply({ content: reply.Giveaway.Reply4.replace("[AUTHOR]", message.author).replace("[WINNERS]", newWinner).replace("[PRIZE]", Prize).replace("[GIVEAWAYLINK]", giveawaymessage.url),}).then(async () =>{
                    await message.delete()
                  })
              } else {
                  message.reply({ content: reply.Giveaway.Reply5.replace("[GIVEAWAYLINK]", giveawaymessage.url), ephemeral: true  }).then(async () =>{
                    await message.delete()
                  })
              }
      
        } catch (error) {
            console.log(error)
            return message.reply({ embeds: [replyEmbeds.notFoundEmbed], allowedMentions: { repliedUser: false } })
        }
    }
};