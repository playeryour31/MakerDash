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
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("giveaway")
const moment = require('moment-timezone');
const _ = require('lodash');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('greroll')
    	.setDescription('Reroll a giveaway to select a new winner.')
        .addStringOption(id => id
            .setName("message_id")
            .setDescription("Put the giveaway id.")
            .setRequired(true))
            .addIntegerOption(winners => winners
                .setName("winners_count")
                .setDescription("The number of new winners.")
                .setRequired(true))
    ,
    type: "Giveaway",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator"
    ,
    support: false,
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const ID = interaction.options.getString("message_id")
            const winners = interaction.options.getInteger("winners_count")

              if (isNaN(ID) || isNaN(winners)) return interaction.reply({ embeds: [replyEmbeds.usageEmbed],ephemeral:true ,allowedMentions: { repliedUser: false } })

              
              let endcheck = db.get(`${ID}_Data`) || null
              const data = db.get(`RunningGiveaway_${client.user.id}`)
              if (!data.length && !endcheck) return interaction.reply({ content: reply.Giveaway.Reply2, ephemeral: true });
              const DB = data.filter(da => da.messageID === ID);
              if (!DB) return interaction.reply({ content: reply.Giveaway.Reply2, ephemeral: true });
              if (!endcheck) return interaction.reply({ content: reply.Giveaway.Reply3, ephemeral: true });
      
      
              const channel = await client.channels.cache.get(endcheck.channelID)
              const Prize = endcheck.Prize;
              const participants = db.get(`${interaction.guild.id}_${ID}_Members`);
              const winnersCount = parseInt(winners);
              const newWinners = _.sampleSize(_.difference(participants, endcheck.Winner, endcheck.Reroll), Math.min(winnersCount, participants?.length));
              endcheck.Reroll = [...endcheck.Reroll, ...newWinners];
              db.set(`${ID}_Data`, endcheck);
              const newWinner = newWinners.map(winner => `<@!${winner}>`).join(", ");
              const giveawaymessage = await channel.messages.fetch(ID);
      
      
              if (newWinner) {
                  interaction.reply({ content: reply.Giveaway.Reply4.replace("[AUTHOR]", interaction.author).replace("[WINNERS]", newWinner).replace("[PRIZE]", Prize).replace("[GIVEAWAYLINK]", giveawaymessage.url),}).then(async () =>{
                    await interaction.delete()
                  })
              } else {
                  interaction.reply({ content: reply.Giveaway.Reply5.replace("[GIVEAWAYLINK]", giveawaymessage.url), ephemeral: true  }).then(async () =>{
                    await interaction.delete()
                  })
              }
      
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};