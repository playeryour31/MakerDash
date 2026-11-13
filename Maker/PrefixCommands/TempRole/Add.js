const { PermissionFlagsBits, MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const { Database } = require("st.db");
const db = require("../../lib/featureDb")("temp_role");
const moment = require('moment-timezone');

module.exports = {
    name: "temprole-add",
    type: "TempRole",
    botP: [],
    userP: [PermissionFlagsBits.Administrator],
    P: "Administrator",
    ownerOnly: false,

    /**
    * @param {Message} message
    * @param {string[]} args
    */
    run: async (client, message, args, language, reply, replyEmbeds, name) => {
        try {
            const tempRoles = await db.get("TempRole") || [];

if (!args[0]) {
    return message.reply({ content: language === "Ar" ? "من فضلك حدد مستخدمًا." : "Please specify a user." });
}

const user = message.mentions.users.first();
if (!user) {
    return message.reply({ content: language === "Ar" ? "المستخدم غير موجود." : "User not found." });
}

const role = message.mentions.roles.first();
if (!role) {
    return message.reply({ content: language === "Ar" ? "من فضلك حدد رتبة." : "Please specify a role." });
}

            const durationInput = args[2];
            if (!durationInput) {
                return message.reply({ content: reply.TempRole.Reply4 });
            }

            const reason = args.slice(3).join(" ") || "No reason provided"; 
            const member = message.guild.members.cache.get(user.id);

            if (member.roles.cache.has(role.id)) {
                return message.reply({
                    content: reply.TempRole.Reply3.replace("[ROLENAME]", role.name).replace("[TAG]", user.tag),
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
                        return message.reply({ content: reply.TempRole.Reply1 });
                }

                if (timeInSeconds >= 60 * 60 * 24 * 30) {
                    readableDuration = `${Math.floor(timeInSeconds / (60 * 60 * 24 * 30))} ${timeUnits[lang].mo}`;
                }

            } else {
                return message.reply({ content: reply.TempRole.Reply1 });
            }

            const endTime = moment().add(timeInSeconds, 'seconds').format('YYYY-MM-DD HH:mm:ss');

            await member.roles.add(role).then(async () => {
                await db.push('TempRole', {
                    StartTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                    EndTime: endTime,
                    Guild: message.guild.id,
                    User: user.id,
                    Role: role.id,
                    Admin: message.author.id,
                    Reason: reason,
                    Client: client.user.id
                });

                message.reply({
                    content: reply.TempRole.Reply2
                        .replace("[ROLENAME]", role.name)
                        .replace("[TAG]", user.tag)
                        .replace("[TIMEINSECONDS]", readableDuration),
                });
            }).catch(err => {
                console.error(err);
                message.reply({ content: reply.Errors.Reply3 });
            });

        } catch (error) {
            console.error(error);
            return message.reply({ embeds: [replyEmbeds.errorEmbed] });
        }
    },
};
