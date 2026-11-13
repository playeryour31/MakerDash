const axios = require('axios');
const { Database } = require(require('path').join(process.cwd(), 'src/shared/services/mainDb'));

const WorkingTokens = new Database("/Database/Tokens/WorkingTokens.json");
const NonWorkingTokens = new Database("/Database/Tokens/NonWorkingTokens.json");

/**
 * Check if a bot token is working by making an API request.
 * @param {string} token - The bot token to check.
 * @returns {Promise<object>} The status of the token and additional information.
 */
async function checkToken(token) {
    try {
        const response = await axios.get('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bot ${token}`,
            },
        });

        const { id, username, discriminator } = response.data;
        const creationTimestamp = BigInt(id) >> 22n; 
        const creationDate = new Date(Number(creationTimestamp) + 1420070400000);

        if (!WorkingTokens.has("TOKENS")) {
            WorkingTokens.set("TOKENS", []);
        }

        const currentTokens = WorkingTokens.get("TOKENS");
        currentTokens.push(token);
        WorkingTokens.set("TOKENS", currentTokens);

        return {
            token,
            status: 'working',
            info: {
                id,
                username,
                discriminator,
                creationDate: creationDate.toISOString(),
            },
        };
    } catch (error) {
        const reason = error.response?.status === 401
            ? 'Invalid Token'
            : `Error: ${error.response?.status || error.message}`;

        if (!NonWorkingTokens.has("TOKENS")) {
            NonWorkingTokens.set("TOKENS", []);
        }

        const currentTokens = NonWorkingTokens.get("TOKENS");
        currentTokens.push({ token, reason });
        NonWorkingTokens.set("TOKENS", currentTokens);

        return {
            token,
            status: 'not working',
            reason,
        };
    }
}