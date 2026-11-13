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
        .setName("temprole-remove")
        .setDescription("Remove a temporary role from a user.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove the temporary role from')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to be removed')
                .setRequired(true)),

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

            const member = interaction.guild.members.cache.get(user.id);
            if (!member) {
                return interaction.reply({
                    content: reply.TempRole.Reply9,
                    ephemeral: true
                });
            }

            if (!member.roles.cache.has(role.id)) {
                return interaction.reply({
                    content: reply.TempRole.Reply10 + `${role.name}.`,
                    ephemeral: true
                });
            }

            const tempRoles = await db.get('TempRole') || [];
            const tempRoleEntry = tempRoles.find(entry => entry.User === user.id && entry.Role === role.id && entry.Guild === interaction.guild.id);

            if (!tempRoleEntry) {
                return interaction.reply({
                    content: reply.TempRole.Reply11.replace("[Role]", role.name).replace("[User]", user.tag),
                    ephemeral: true
                });
            }

            await member.roles.remove(role).then(async () => {
                await db.set('TempRole', tempRoles.filter(entry => entry.User !== user.id || entry.Role !== role.id || entry.Guild !== interaction.guild.id));

                interaction.reply({
                    content: reply.TempRole.Reply12.replace("[Role]", role.name).replace("[User]", user.tag),
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
