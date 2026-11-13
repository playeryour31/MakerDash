const { Database } = require('./mainDb');
const { paths } = require('../db/paths');
const botDataClient = require('./botDataClient');

const rundb = new Database(paths.runBots);
const tokendb = new Database(paths.tokens);

/**
 * Runtime control for customer bots — shared by Discord Maker UI and Nest internal API.
 * Backed by Prisma (mainDb); optional bot-data API when USE_BOT_DATA_API is on.
 */
function listTokens() {
  return tokendb.get('Bots') || [];
}

async function listTokensAsync() {
  if (botDataClient.useApi()) {
    try {
      return await botDataClient.listBots({ includeToken: true });
    } catch {
      /* fall through */
    }
  }
  return listTokens();
}

function getTokenByClientId(clientId) {
  return listTokens().find((t) => t.ClientID === clientId) || null;
}

function isBotRunning(clientId) {
  return Boolean(rundb.get(clientId));
}

async function isBotRunningAsync(clientId) {
  if (botDataClient.useApi()) {
    try {
      return await botDataClient.isRunning(clientId);
    } catch {
      /* fall through */
    }
  }
  return isBotRunning(clientId);
}

function setBotRunning(clientId, shouldRun) {
  return rundb.set(clientId, Boolean(shouldRun));
}

async function setBotRunningAsync(clientId, shouldRun) {
  if (botDataClient.useApi()) {
    try {
      await botDataClient.setRunning(clientId, shouldRun);
      return Boolean(shouldRun);
    } catch {
      /* fall through */
    }
  }
  return setBotRunning(clientId, shouldRun);
}

function getLiveClient(clientId) {
  return global.bots?.[clientId] || null;
}

module.exports = {
  listTokens,
  listTokensAsync,
  getTokenByClientId,
  isBotRunning,
  isBotRunningAsync,
  setBotRunning,
  setBotRunningAsync,
  getLiveClient,
};
