const {
    PermissionFlagsBits,
    SlashCommandBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const { Database } = require("st.db");
const db = require("../../lib/featureDb")("temp_role");
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("temprole-add")
        .setDescription("Give a temporary role to a user.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to receive the temporary role')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to be assigned temporarily')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('How long the role should last (e.g., 10m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for assigning the temporary role')
                .setRequired(false)),

    type: "TempRole",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    support: false,
    ownerOnly: false,

    async run(client, interaction, language, reply, replyEmbeds, name) {
        try {
            const user = interaction.options.getUser('user');
            const role = interaction.options.getRole('role');
            const durationInput = interaction.options.getString('duration');
            const reason = interaction.options.getString('reason') || "No reason provided";

            if (!durationInput) {
                return interaction.reply({ content: reply.TempRole.Reply4, ephemeral: true });
            }

            const member = interaction.guild.members.cache.get(user.id);
            if (member.roles.cache.has(role.id)) {
                return interaction.reply({
                    content: reply.TempRole.Reply3.replace("[ROLENAME]", role.name).replace("[TAG]", user.tag),
                    ephemeral: true
                });
            }

            let timeInSeconds;
            let readableDuration;
            const durationRegex = /^(\d+)([smhd])$/;
            const match = durationInput.match(durationRegex);

            if (match) {
                const value = parseInt(match[1]);
                const unit = match[2];

                const timeUnits = {
                    en: { s: "second", m: "minute", h: "hour", d: "day", mo: "month" },
                    ar: { s: "ثانية", m: "دقيقة", h: "ساعة", d: "يوم", mo: "شهر" }
                };
                const lang = language === "Ar" ? "ar" : "en";

                switch (unit) {
                    case 's':
                        timeInSeconds = value;
                        readableDuration = `${value} ${timeUnits[lang].s}${value > 1 ? (lang === "ar" ? "ثوانٍ" : "s") : ""}`;
                        break;
                    case 'm':
                        timeInSeconds = value * 60;
                        readableDuration = `${value} ${timeUnits[lang].m}${value > 1 ? (lang === "ar" ? "دقائق" : "s") : ""}`;
                        break;
                    case 'h':
                        timeInSeconds = value * 60 * 60;
                        readableDuration = `${value} ${timeUnits[lang].h}${value > 1 ? (lang === "ar" ? "ساعات" : "s") : ""}`;
                        break;
                    case 'd':
                        timeInSeconds = value * 60 * 60 * 24;
                        readableDuration = `${value} ${timeUnits[lang].d}${value > 1 ? (lang === "ar" ? "أيام" : "s") : ""}`;
                        break;
                    default:
                        return interaction.reply({ content: reply.TempRole.Reply1, ephemeral: true });
                }

                if (timeInSeconds >= 60 * 60 * 24 * 30) {
                    readableDuration = `${Math.floor(timeInSeconds / (60 * 60 * 24 * 30))} ${timeUnits[lang].mo}`;
                }

            } else {
                return interaction.reply({ content: reply.TempRole.Reply1, ephemeral: true });
            }

            const endTime = moment().add(timeInSeconds, 'seconds').format('YYYY-MM-DD HH:mm:ss');

            await member.roles.add(role).then(async () => {
                await db.push('TempRole', {
                    StartTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                    EndTime: endTime,
                    Guild: interaction.guild.id,
                    User: user.id,
                    Role: role.id,
                    Admin: interaction.user.id,
                    Reason: reason,
                    Client: client.user.id
                });

                interaction.reply({
                    content: reply.TempRole.Reply2
                        .replace("[ROLENAME]", role.name)
                        .replace("[TAG]", user.tag)
                        .replace("[TIMEINSECONDS]", readableDuration),
                    ephemeral: false
                });
            }).catch(err => {
                console.error(err);
                interaction.reply({ content: reply.Errors.Reply3, ephemeral: true });
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({ embeds: [replyEmbeds.errorEmbed], ephemeral: true, allowedMentions: { repliedUser: false } });
        }
    },
};
