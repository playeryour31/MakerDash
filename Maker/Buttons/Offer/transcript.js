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
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
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
    RoleSelectMenuBuilder,
    PermissionOverwrites,
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db")
const db = require("../../lib/featureDb")("offer")
const db2 = require("../../lib/featureDb")("temp_ticket")
const discordTranscripts = require('discord-html-transcripts');// npm i discord-html-transcripts@3.1.3
module.exports = {
    name: "tickettranscript",
    botP: [],
    userP: [],
    P: "",
    ownerOnly: false,
    /**
* @param {ChatInputCommandInteraction} interaction
*/
    run: async (client, interaction, language, reply, replyEmbeds, name) => {
        try {
            interaction.deferUpdate();
                        const CountsDB = interaction.customId.split("_")[0].trim();
					//	console.log(CountsDB);
                        const FirstDB = db.get("OfferData_" + client.user.id + "_" + interaction.guild.id) || null;
                        const SecendDB = db.get("OfferticketSetupData_" + client.user.id + "_" + interaction.guild.id) || null;
                        const OfferDB = db.get("NewOffer_" + CountsDB + "_" + client.user.id + "_" + interaction.guild.id) || null;
       if (!FirstDB) {
                return interaction.reply({ content: reply.Offer.Reply4, ephemeral: true, allowedMentions: { repliedUser: false } });
            }
            if (!SecendDB) {
                return interaction.reply({ content: reply.Offer.Reply4, ephemeral: true, allowedMentions: { repliedUser: false } });
            }
 
            let TranChannelID = FirstDB.offersLog || null
            if (!TranChannelID)
                return interaction.reply({ content: reply.Ticket.Reply15, ephemeral: true, allowedMentions: { repliedUser: false } })

            let TranChannel = interaction.guild.channels.cache.get(TranChannelID) || interaction.guild.channels.fetch(TranChannel).catch()
            if (!TranChannel)
                return interaction.reply({ content: reply.Ticket.Reply16, ephemeral: true, allowedMentions: { repliedUser: false } })
                       const Status = FirstDB.offerTranscript || "on";
              if (Status === "on") {
            const sEmbed = new EmbedBuilder()
                .setColor("Yellow")
                .setDescription(reply.Ticket.Reply17)

            let s = await interaction.channel.send({ embeds: [sEmbed] })
            let member = interaction.guild.members.cache.get(interaction.channel.topic).user || { username: interaction.guild.name, avatarURL: interaction.guild.iconURL() }
            const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                limit: -1,
                returnType: 'attachment',
                filename: interaction.channel.name + '.html',
                saveImages: true,
                footerText: "Exported {number} message{s}, Powered by Volvo, /gg.glov4s",
                poweredBy: false,
                ssr: true
            });
            const theembed = interaction.message.embeds[0].description;
            const userIdMatch = /<@(\d+)>/.exec(theembed);
            let closer = "unknown"
            if (userIdMatch) closer = userIdMatch[1]


            let tarMSG = await TranChannel.send({ files: [attachment] });

            let embed = new EmbedBuilder()
                .setAuthor({ name: member.username, iconURL: member.avatarURL({ dynamic: true }) })
                .setColor(interaction.guild.members.me.displayHexColor)
                .addFields(
                    {
                        name: reply.Ticket.TranScript.fields.name1,
                        value: reply.Ticket.TranScript.fields.value1.replace("[USER]", member),
                        inline: true
                    },
                    {
                        name: reply.Ticket.TranScript.fields.name2,
                        value: reply.Ticket.TranScript.fields.value2.replace("[TICKETNAME]", interaction.channel.name),
                        inline: true
                    },
                    {
                        name: reply.Ticket.TranScript.fields.name3,
                        value: reply.Ticket.TranScript.fields.value3.replace("[CLOSER]", "<@!" + closer + ">"),
                        inline: true
                    },
                    {
                        name: reply.Ticket.TranScript.fields.name4,
                        value: reply.Ticket.TranScript.fields.value4.replace("[URL]", "https://mahto.id/chat-exporter?url=" + tarMSG.attachments.first()?.url),
                        inline: true
                    },
                )
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setTimestamp()

            const button = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL("https://mahto.id/chat-exporter?url=" + tarMSG.attachments.first()?.url)
                    .setLabel(reply.Ticket.TranScript.buttonName)
            ]);


            TranChannel.send({ embeds: [embed], components: [button] }).then(() => {
                const sEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setDescription(reply.Ticket.Reply18)

                s.edit({ embeds: [sEmbed] })
                member.send({ embeds: [embed], components: [button] }).catch()
            })
              } else {
                await interaction.reply({ content: reply.Offer.Reply11, ephemeral: true, allowedMentions: { repliedUser: false } })
          }
        } catch (error) {
            console.log(error)
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } })
        }
    },
};
