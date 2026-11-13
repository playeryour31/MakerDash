const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Database } = require("st.db");
const BlacklistDB = new Database("./Subscriptions/Database/Makers/Blacklist.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blacklist")
        .setDescription("Manage the blacklist system.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add a user to the blacklist.")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("The user to add to the blacklist.")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for blacklisting the user.")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove a user from the blacklist.")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("The user to remove from the blacklist.")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("show")
                .setDescription("Show all blacklisted users.")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("find")
                .setDescription("Find out if a user is blacklisted.")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("The user to check for blacklisting.")
                        .setRequired(true)
                )
        ),
    ownerOnly: true,

    async run(client, interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const blacklistKey = `blacklisted_${client.user.id}_${interaction.guild.id}`;

        switch (subcommand) {
            case "add":
                const blacklistData = {
                    userId: user.id,
                    reason: reason,
                    timestamp: moment().format("YYYY-MM-DD HH:mm"),
                };

                await BlacklistDB.push(blacklistKey, blacklistData);

                const embedAdd = new EmbedBuilder()
                    .setColor(interaction.guild.members.me.displayHexColor)
                    .setDescription(`## Blacklisted User\n**User:** ${user.tag}\n**Reason:** ${reason}`);

                await interaction.reply({ embeds: [embedAdd], ephemeral: false });
                break;

            case "remove":
                const blacklistList = BlacklistDB.get(blacklistKey) || [];
                const updatedList = blacklistList.filter(entry => entry.userId !== user.id);

                await BlacklistDB.set(blacklistKey, updatedList);

                const embedRemove = new EmbedBuilder()
                    .setColor(interaction.guild.members.me.displayHexColor)
                    .setDescription(`## User Removed from Blacklist\n**User:** ${user.tag} has been removed from the blacklist.`);

                await interaction.reply({ embeds: [embedRemove], ephemeral: false });
                break;

            case "show":
                const blacklistedUsers = BlacklistDB.get(blacklistKey) || [];
                const embedShow = new EmbedBuilder()
                    .setColor(interaction.guild.members.me.displayHexColor)
                    .setDescription(
                        blacklistedUsers.map(entry => 
                            `## Blacklisted User\n**User:** <@${entry.userId}>\n**Reason:** ${entry.reason}\n`
                        ).join("\n") || "## No users are blacklisted."
                    );

                await interaction.reply({ embeds: [embedShow], ephemeral: false });
                break;

            case "find":
                const blacklistEntries = BlacklistDB.get(blacklistKey) || [];
                const userEntry = blacklistEntries.find(entry => entry.userId === user.id);

                const embedFind = new EmbedBuilder()
                    .setColor(interaction.guild.members.me.displayHexColor)
                    .setDescription(
                        userEntry 
                            ? `## User is Blacklisted\n**User:** ${user.tag}\n**Reason:** ${userEntry.reason}`
                            : `## User is Not Blacklisted\n**User:** ${user.tag} is not blacklisted.`
                    );

                await interaction.reply({ embeds: [embedFind], ephemeral: false });
                break;
        }
    }
};