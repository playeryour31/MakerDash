const { Database } = require("st.db");
const tokendb = new Database("./Database/Others/Tokens.json");
const rundb = new Database("./Database/BotMaker/RunBots.json");
let tokens = tokendb.get("Bots") || [];
const path = require("path");
const fs = require("fs");
const botDataClient = require("../src/shared/services/botDataClient");
const featureCache = require("../src/shared/services/featureCache");
const { getScheduler } = require("../src/shared/runtime/scheduler");
const { startBotHealthSupervisor } = require("./lib/botHealthSupervisor");

// Hydrate FeatureRecord cache ASAP (handlers fall back to JSON until ready)
featureCache.hydrateAll().catch((err) => {
  console.warn(`[Maker] featureCache hydrate failed: ${err.message}`);
});

const prefixDB = new Database("/Database/Others/PrefixData.json");
let autolinedb = require("./lib/featureDb")("autoline");
let feedbackdb = require("./lib/featureDb")("feedback");
let taxdb = require("./lib/featureDb")("tax");
const suggestiondb = require("./lib/featureDb")("suggestion");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
const VoicesDB = new Database("./Database/Others/Voices.json");
const {
  Client,
  Collection,
  Discord,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
  createInvite,
  EmbedBuilder,
  ChannelType,
  ActivityType,
  WebhookClient,
  PermissionsBitField,
  GatewayIntentBits,
  Partials,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  Events,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  GatewayCloseCodes,
} = require("discord.js");
const { readdirSync } = require("fs");
const { GiveawaysManager } = require("discord-giveaways");
const GiveawaysDB = require("./lib/featureDb")("giveaway");
if (!global.bots) global.bots = {};
if (!global.loggedInTokens) global.loggedInTokens = new Set();
if (!global.loggingInTokens) global.loggingInTokens = new Set();
if (!global.botNotReadySince) global.botNotReadySince = new Map();

let processGuardsInstalled = false;

function isBenignDiscordAbort(error) {
  if (!error) return false;
  const name = String(error.name || '');
  const code = error.code;
  const msg = String(error.message || '');
  // @discordjs/rest aborts in-flight HTTP after rest.timeout (default 15s)
  if (name === 'AbortError' || code === 20) return true;
  if (msg === 'This operation was aborted') return true;
  if (msg.includes('The operation was aborted')) return true;
  return false;
}

function installProcessGuardsOnce() {
  if (processGuardsInstalled) return;
  processGuardsInstalled = true;
  process.on('unhandledRejection', (error) => {
    if (isBenignDiscordAbort(error)) {
      // Rate-limit noise: Discord REST timed out; next manager tick retries.
      if (!installProcessGuardsOnce._abortLogAt) {
        installProcessGuardsOnce._abortLogAt = 0;
      }
      const now = Date.now();
      if (now - installProcessGuardsOnce._abortLogAt > 60_000) {
        installProcessGuardsOnce._abortLogAt = now;
        console.warn(
          '[Maker] Discord REST request timed out (aborted). Usually network/Discord lag — ignored.',
        );
      }
      return;
    }
    console.error('Unhandled promise rejection:', error);
  });
  process.on('uncaughtException', (err) => {
    if (isBenignDiscordAbort(err)) return;
    console.error(err);
  });
  process.on('uncaughtExceptionMonitor', (err) => {
    if (isBenignDiscordAbort(err)) return;
    console.error(err);
  });
  process.on('warning', () => {});
}

function isBotConnected(client) {
  try {
    if (!client) return false;
    if (typeof client.isReady === 'function' && client.isReady()) return true;
    // discord.js destroy()-on-failed-login leaves ws.destroyed=true forever
    return Boolean(client.user && client.readyTimestamp);
  } catch {
    return false;
  }
}

/** True only for stuck/disconnected clients — never during an active login. */
function shouldReconnectZombie(botID, token, client) {
  if (!client) return false;
  if (global.loggingInTokens.has(token)) return false;
  if (isBotConnected(client)) {
    global.botNotReadySince.delete(botID);
    return false;
  }
  const now = Date.now();
  if (!global.botNotReadySince.has(botID)) {
    global.botNotReadySince.set(botID, now);
    return false; // grace: wait before tearing down
  }
  const age = now - global.botNotReadySince.get(botID);
  return age >= 20_000; // 20s without ready → reconnect
}

function isNetworkLoginError(err) {
  try {
    return require('../src/maker/client/keepAlive').isNetworkLoginError(err);
  } catch {
    const code = String(err?.code || '');
    return (
      code === 'UND_ERR_CONNECT_TIMEOUT' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET'
    );
  }
}

function isFatalTokenError(err) {
  try {
    return require('../src/maker/client/keepAlive').isFatalTokenError(err);
  } catch {
    return Number(err?.code) === 401;
  }
}

function loginBackoffMs(botID) {
  if (!global.botLoginBackoff) global.botLoginBackoff = new Map();
  const n = global.botLoginBackoff.get(botID) || 0;
  const delays = [5_000, 15_000, 30_000, 60_000, 120_000];
  return delays[Math.min(n, delays.length - 1)];
}

function bumpLoginBackoff(botID) {
  if (!global.botLoginBackoff) global.botLoginBackoff = new Map();
  global.botLoginBackoff.set(botID, (global.botLoginBackoff.get(botID) || 0) + 1);
}

function clearLoginBackoff(botID) {
  global.botLoginBackoff?.delete(botID);
}

/** Force manager to re-login a desired-on bot (used by health supervisor). */
async function forceCustomerReconnect(botID) {
  const id = String(botID);
  invalidateManagerData();
  const live = global.bots?.[id];
  let token = live?.makerToken || live?.token || null;
  if (!token) {
    const row = loadTokensFromDisk().find((t) => String(t.ClientID) === id);
    token = row?.Token || null;
  }
  // Mid-login — let the in-flight attempt finish
  if (token && global.loggingInTokens?.has(token)) return;
  await stopCustomerBot(id, token);
  clearLoginBackoff(id);
  if (token) {
    global.loggedInTokens?.delete(token);
    global.loggingInTokens?.delete(token);
  }
  global.botNotReadySince?.delete(id);
}

function isBlockedBySubscription(tokenData) {
  try {
    const {
      isBotBlockedFromLogin,
      getGraceSnapshot,
    } = require('../src/shared/services/subscriptionLifecycle');
    const { Database } = require('../src/shared/services/mainDb');
    const expiredDb = new Database('/Database/Others/Expired.json');
    if (getGraceSnapshot(expiredDb, tokenData.ClientID)) return true;
    if (expiredDb.get(`Expired_${tokenData.ClientID}`)) return true;
    return isBotBlockedFromLogin(tokenData);
  } catch {
    return false;
  }
}

function loadTokensFromDisk() {
  try {
    const file = path.join(__dirname, '..', 'Database', 'Others', 'Tokens.json');
    if (!fs.existsSync(file)) return [];
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(raw.Bots) ? raw.Bots : [];
  } catch {
    return [];
  }
}

function loadRunBotsFromDisk() {
  try {
    const file = path.join(__dirname, '..', 'Database', 'BotMaker', 'RunBots.json');
    if (!fs.existsSync(file)) return {};
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    const out = {};
    for (const [k, v] of Object.entries(raw)) out[String(k)] = Boolean(v);
    return out;
  } catch {
    return {};
  }
}

function readRunBotsJson() {
  const fromDisk = loadRunBotsFromDisk();
  try {
    const rows = typeof rundb.all === 'function' ? rundb.all() : [];
    if (Array.isArray(rows) && rows.length) {
      const out = { ...fromDisk };
      for (const r of rows) out[String(r.ID)] = Boolean(r.data);
      return out;
    }
    if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
      const out = { ...fromDisk };
      for (const [k, v] of Object.entries(rows)) out[String(k)] = Boolean(v);
      return out;
    }
  } catch {
    /* ignore */
  }
  return fromDisk;
}

/**
 * PG is preferred when a row exists; JSON fills gaps for bots not yet imported
 * (prevents "desired on in RunBots.json but invisible to manager").
 */
function mergeRuntimeMaps(jsonMap, pgMap) {
  const merged = { ...(jsonMap || {}) };
  for (const [k, v] of Object.entries(pgMap || {})) {
    merged[String(k)] = Boolean(v);
  }
  return merged;
}

function mergeTokenLists(jsonBots, pgBots) {
  const byId = new Map();
  for (const b of jsonBots || []) {
    const id = String(b?.ClientID || b?.clientId || '');
    if (id) byId.set(id, b);
  }
  for (const b of pgBots || []) {
    const id = String(b?.ClientID || b?.clientId || '');
    if (!id) continue;
    // Prefer PG when both exist (encrypted SSOT), keep JSON-only bots
    byId.set(id, b);
  }
  return [...byId.values()];
}

async function readRunBotsFreshRaw() {
  const jsonMap = readRunBotsJson();

  if (botDataClient.useApi()) {
    try {
      const apiMap = await botDataClient.getRuntimeMap({ force: true });
      return mergeRuntimeMaps(jsonMap, apiMap || {});
    } catch (err) {
      console.warn(`[Maker] runtime API fallback: ${err.message}`);
    }
  }
  try {
    const { prisma } = require('@maker/database');
    const rows = await prisma.botRuntime.findMany();
    const pgMap = {};
    for (const r of rows) pgMap[r.clientId] = r.running;
    return mergeRuntimeMaps(jsonMap, pgMap);
  } catch (err) {
    console.warn(`[Maker] runtime pg fallback: ${err.message}`);
    return jsonMap;
  }
}

async function readTokensFreshRaw() {
  // Disk JSON is the safety net when the in-memory tokens_mirror is stale
  let jsonBots = loadTokensFromDisk();
  try {
    const bots = tokendb.get('Bots');
    if (Array.isArray(bots) && bots.length) {
      jsonBots = mergeTokenLists(jsonBots, bots);
    }
  } catch {
    /* continue */
  }

  if (botDataClient.useApi()) {
    try {
      const apiBots = await botDataClient.listBots({
        force: true,
        includeToken: true,
      });
      return mergeTokenLists(jsonBots, apiBots || []);
    } catch (err) {
      console.warn(`[Maker] tokens API fallback: ${err.message}`);
    }
  }

  try {
    const { prisma, decryptBotToken } = require('@maker/database');
    const rows = await prisma.botInstance.findMany();
    const pgBots = rows.map((row) => {
      let token = '';
      try {
        token = decryptBotToken(row.tokenEnc);
      } catch {
        token = '';
      }
      return {
        Token: token,
        Owner: row.ownerId,
        Buyer: row.buyerId || row.ownerId,
        Seller: row.sellerId || undefined,
        ClientID: row.clientId,
        BotID: row.botNumber ?? undefined,
        Type: row.type === 'Muslim' ? 'Azkar' : row.type,
        Servers: row.servers || [],
        Server: row.serverId || row.guildId || undefined,
        guild: row.guildId || row.serverId || undefined,
        Price: row.price ?? undefined,
        Node: row.node ?? undefined,
        PurchasesID: row.purchasesId ?? undefined,
        TokenType: row.tokenType || undefined,
        dashboardSlug: row.dashboardSlug || undefined,
        language: row.language,
      };
    });
    return mergeTokenLists(jsonBots, pgBots);
  } catch (err) {
    console.warn(`[Maker] tokens pg fallback: ${err.message}`);
    return jsonBots;
  }
}

/**
 * Manager data cache.
 *
 * The reconciliation loop runs every MAKER_MANAGER_TICK_MS (default 3s), but
 * runtime/token snapshots change rarely. Re-querying all BotRuntime +
 * BotInstance rows (and decrypting every token) on every tick hammered
 * Postgres ~20x/minute. Snapshots are now refreshed on their own TTL and can
 * be invalidated explicitly after a forced reconnect / token change.
 */
const MANAGER_TICK_MS = Number(process.env.MAKER_MANAGER_TICK_MS) || 3000;
// Runtimes are cheap (one findMany) and drive start/stop latency, so they stay
// at the tick cadence. Tokens require decrypting every BotInstance row, so they
// are cached much longer and refreshed on demand when a bot is missing.
const RUNTIME_REFRESH_MS = Number(process.env.MAKER_RUNTIME_REFRESH_MS) || 3000;
const TOKENS_REFRESH_MS = Number(process.env.MAKER_TOKENS_REFRESH_MS) || 60_000;

const managerCache = {
  runtime: { at: 0, value: null, inflight: null },
  tokens: { at: 0, value: null, inflight: null },
  lastTokenForceAt: 0,
};

function cachedSnapshot(entry, ttlMs, loader, force = false) {
  const now = Date.now();
  if (!force && entry.value !== null && now - entry.at < ttlMs) {
    return Promise.resolve(entry.value);
  }
  if (entry.inflight) return entry.inflight;
  entry.inflight = (async () => {
    try {
      const value = await loader();
      entry.value = value;
      entry.at = Date.now();
      return value;
    } finally {
      entry.inflight = null;
    }
  })();
  return entry.inflight;
}

function getRuntimeMap(force = false) {
  return cachedSnapshot(
    managerCache.runtime,
    RUNTIME_REFRESH_MS,
    readRunBotsFreshRaw,
    force,
  );
}

function getTokensSnapshot(force = false) {
  return cachedSnapshot(
    managerCache.tokens,
    TOKENS_REFRESH_MS,
    readTokensFreshRaw,
    force,
  );
}

/** Drop cached snapshots (runtime/token edits, forced reconnect). */
function invalidateManagerData() {
  managerCache.runtime.at = 0;
  managerCache.tokens.at = 0;
}

async function stopCustomerBot(botID, token) {
  if (!global.bots[botID]) return;
  const live = global.bots[botID];
  const resolved = token || live?.makerToken || live?.token;
  try {
    const { stopAutomodPoll } = require('./lib/protectionAutomodSync');
    stopAutomodPoll(botID);
  } catch (_) {}
  try {
    const { stopRecoveryPoll } = require('./lib/protectionHardening');
    stopRecoveryPoll(botID);
  } catch (_) {}
  try {
    const { stopLockdownPoll } = require('./lib/protectionAdvanced');
    stopLockdownPoll(botID);
  } catch (_) {}
  try {
    await live.destroy();
  } catch (err) {
    console.error(`⚠️ Error stopping ${botID}: ${err.message}`);
  }
  delete global.bots[botID];
  global.botNotReadySince.delete(botID);
  if (resolved) {
    global.loggedInTokens.delete(resolved);
    global.loggingInTokens.delete(resolved);
  }
  console.log(`🛑 ${botID} Offline`);
}

installProcessGuardsOnce();

// The scheduler refuses to overlap a job with itself, so the old
// `managerTickRunning` flag is no longer needed.
const managerTick = async () => {
  try {
    const runMap = await getRuntimeMap();
    let tokens = await getTokensSnapshot();

    const botIDs = new Set([
      ...Object.keys(runMap),
      ...Object.keys(global.bots || {}),
    ]);

    for (const botID of botIDs) {
      const shouldRun = Boolean(runMap[botID]);
      let tokenData = tokens.find((t) => String(t.ClientID) === String(botID));

      // A newly provisioned bot may not be in the cached snapshot yet.
      // Refresh at most once per 10s so missing bots don't hammer Postgres.
      if (
        !tokenData &&
        shouldRun &&
        Date.now() - managerCache.lastTokenForceAt > 10_000
      ) {
        managerCache.lastTokenForceAt = Date.now();
        tokens = await getTokensSnapshot(true);
        tokenData = tokens.find((t) => String(t.ClientID) === String(botID));
      }

      if (!tokenData) {
        if (global.bots[botID]) {
          await stopCustomerBot(botID, global.bots[botID]?.token);
        }
        continue;
      }

      const token = tokenData.Token;

      // Grace / expired subscriptions must not stay online
      if (isBlockedBySubscription(tokenData)) {
        if (global.bots[botID]) {
          await stopCustomerBot(botID, token);
        }
        if (shouldRun) {
          try {
            const { runtimes } = require('../src/shared/services/mainDb');
            await runtimes.setRunning(botID, false);
          } catch {
            /* ignore */
          }
        }
        continue;
      }

      if (shouldRun) {
        // Network login backoff
        if (!global.botLoginNextOk) global.botLoginNextOk = new Map();
        const nextOk = global.botLoginNextOk.get(botID) || 0;
        if (Date.now() < nextOk) {
          continue;
        }

        const live = global.bots[botID];
        if (shouldReconnectZombie(botID, token, live)) {
          console.warn(
            `[Maker] ${botID} runtime=on but Discord not ready for 20s — reconnecting`,
          );
          await stopCustomerBot(botID, token);
        }

        // Refresh guild lock when Server/guildId changes in Tokens/PG — leave old guild.
        const liveClient = global.bots[botID];
        if (liveClient && isBotConnected(liveClient)) {
          try {
            const {
              resolveLockedGuildId,
              enforceGuildLock,
            } = require('./lib/guildLock');
            liveClient.makerTokenRow = tokenData;
            liveClient.makerClientId = String(botID);
            const nextLock = resolveLockedGuildId(tokenData);
            const prev = liveClient.makerServerId
              ? String(liveClient.makerServerId)
              : '';
            if (String(nextLock || '') !== prev) {
              liveClient.makerServerId = nextLock;
              await enforceGuildLock(liveClient);
            } else if (nextLock) {
              liveClient.makerServerId = nextLock;
            }
          } catch {
            /* ignore lock refresh errors */
          }
        }

        if (global.loggingInTokens.has(token)) {
          continue;
        }

        // Orphan lock: token marked logged-in but no live client → allow re-login
        if (!global.bots[botID] && global.loggedInTokens.has(token)) {
          global.loggedInTokens.delete(token);
        }

        if (!global.bots[botID] && !global.loggedInTokens.has(token)) {
          global.loggingInTokens.add(token);
          const { readdirSync } = require("fs");
          const client = new Client({
            intents: [
              GatewayIntentBits.DirectMessages,
              GatewayIntentBits.Guilds,
              GatewayIntentBits.GuildMessages,
              GatewayIntentBits.MessageContent,
              GatewayIntentBits.GuildMembers,
              GatewayIntentBits.AutoModerationExecution,
              GatewayIntentBits.AutoModerationConfiguration,
              GatewayIntentBits.DirectMessageReactions,
              GatewayIntentBits.DirectMessageTyping,
              GatewayIntentBits.GuildEmojisAndStickers,
              GatewayIntentBits.GuildIntegrations,
              GatewayIntentBits.GuildInvites,
              GatewayIntentBits.GuildMessageReactions,
              GatewayIntentBits.GuildMessageTyping,
              GatewayIntentBits.GuildModeration,
              GatewayIntentBits.GuildPresences,
              GatewayIntentBits.GuildScheduledEvents,
              GatewayIntentBits.GuildWebhooks,
              GatewayIntentBits.GuildVoiceStates,
            ],
            partials: [
              Partials.Channel,
              Partials.Message,
              Partials.User,
              Partials.GuildMember,
              Partials.Reaction,
              Partials.GuildScheduledEvent,
              Partials.ThreadMember,
            ],
            rest: {
              // Default 15s is tight on slow networks; abort spam comes from here
              timeout: Number(process.env.DISCORD_REST_TIMEOUT_MS) || 30_000,
              retries: 2,
            },
          });
          // Hold slot so the manager loop does not spawn duplicates mid-login
          global.bots[botID] = client;
          client.makerToken = token;
          client.token = token;
          try {
            const { resolveLockedGuildId } = require('./lib/guildLock');
            client.makerClientId = String(botID);
            client.makerTokenRow = tokenData;
            client.makerServerId = resolveLockedGuildId(tokenData);
          } catch {
            client.makerServerId = null;
          }
          global.botNotReadySince.delete(botID);

          client.on("error", (error) => {
            console.error(`[Maker] ${botID} client error:`, error?.message || error);
            if (!isBotConnected(client)) {
              void stopCustomerBot(botID, token);
            }
          });

          client.on("shardError", (error) => {
            console.error(`[Maker] ${botID} shard error:`, error?.message || error);
          });

          client.on("shardDisconnect", () => {
            if (!isBotConnected(client)) {
              void stopCustomerBot(botID, token);
            }
          });
          const commandsdb = new Database(
            `/Database/CommandsData/BotsCommands_${tokenData.ClientID}.json`,
          );
          client.slashcommands = new Collection();
          const slashcommands = [];
          const dd =
            tokenData && tokenData.ClientID ? tokenData.ClientID : "1234";
          let botCommands = commandsdb.get("commands_" + dd) || [];

          // Ensure prefix-only catalog entries that we wrap as slash have slash_commandName
          const ensureSlashNames = ['help', 'line'];
          for (const c of botCommands) {
            if (!c || typeof c !== 'object') continue;
            const id = String(c.prefix_commandName || c.name || '');
            if (ensureSlashNames.includes(id) && !c.slash_commandName) {
              c.slash_commandName = id;
              c.slash = true;
              c.slash_fileName = c.slash_fileName || id;
            }
            // Slash-only: allow prefix bridge (dashboard + runtime)
            if (c.slash_commandName && !c.prefix_commandName) {
              c.prefix = true;
            }
          }

          // System leveling commands (always available for System bots)
          const isSystemBot = String(tokenData?.Type || '')
            .toLowerCase()
            .replace(/[\s_-]+/g, '')
            .match(/^(system|sistem|sys)$/);
          if (isSystemBot) {
            const ensure = [
              {
                type: 'System',
                slash_commandName: 'rank',
                prefix_commandName: 'rank',
              },
              {
                type: 'System',
                slash_commandName: 'leaderboard',
                prefix_commandName: 'leaderboard',
              },
            ];
            for (const cmd of ensure) {
              const exists = botCommands.some(
                (c) =>
                  c &&
                  (c.slash_commandName === cmd.slash_commandName ||
                    c.prefix_commandName === cmd.prefix_commandName),
              );
              if (!exists) botCommands.push(cmd);
            }
          }

          if (!Array.isArray(botCommands) || botCommands.length === 0) {
            console.log("⚠️ botCommands is empty or not an array.");
          } else {
            for (let folder of fs
              .readdirSync(path.join(__dirname, "SlashCommands"))
              .filter((folder) => !folder.includes("."))) {
              for (let file of fs
                .readdirSync(path.join(__dirname, "SlashCommands", folder))
                .filter((f) => f.endsWith(".js"))) {
                let commandPath = path.join(
                  __dirname,
                  "SlashCommands",
                  folder,
                  file,
                );
                delete require.cache[require.resolve(commandPath)];
                let command = require(commandPath);
                if (command) {
                  botCommands.forEach((com) => {
                    if (!com || typeof com !== "object") {
                      return;
                    }

                    if (!com.type || !com.slash_commandName) {
                      return;
                    }

                    if (
                      (com.type == command.type ||
                        (com.type == 'Azkar' && command.type == 'Muslim') ||
                        (com.type == 'Muslim' && command.type == 'Azkar')) &&
                      com.slash_commandName == command.data.name
                    ) {
                      slashcommands.push(command.data);
                      client.slashcommands.set(command.data.name, command);
                    }
                  });
                } else {
                  console.log(botCommands.length + " not working check it");
                }
              }
            }
          }
          if (tokenData.Token && tokenData.ClientID) {
            client.on("ready", async () => {
              const rest = new REST({ version: "10" }).setToken(
                tokenData.Token,
              );
              (async () => {
                try {
                  await rest.put(
                    Routes.applicationCommands(tokenData.ClientID),
                    {
                      body: slashcommands,
                    },
                  );
                } catch (error) {
                  console.error(error);
                }
              })();

              try {
                const botType = String(tokenData?.Type || '')
                  .toLowerCase()
                  .replace(/[\s_-]+/g, '');
                let isProtectionBot =
                  botType === 'protection' ||
                  botType === 'protect' ||
                  botType === 'guard';
                if (!isProtectionBot) {
                  try {
                    const commandsdbReady = new Database(
                      `/Database/CommandsData/BotsCommands_${client.user.id}.json`,
                    );
                    const cmds =
                      commandsdbReady.get('commands_' + client.user.id) || [];
                    isProtectionBot = cmds.some(
                      (c) => c && c.type === 'Protection',
                    );
                  } catch (_) {}
                }
                if (isProtectionBot) {
                  const {
                    attachAutomodSync,
                  } = require('./lib/protectionAutomodSync');
                  attachAutomodSync(client);
                  const {
                    attachRecoveryPoll,
                  } = require('./lib/protectionHardening');
                  attachRecoveryPoll(client);
                  const {
                    attachLockdownPoll,
                  } = require('./lib/protectionAdvanced');
                  attachLockdownPoll(client);
                }
              } catch (err) {
                console.warn(
                  `[Maker] protection automod attach failed: ${err?.message || err}`,
                );
              }
            });
          } else {
            return;
          }

          // Join Leave Function
          var { inviteTracker } = require("discord-inviter"),
            tracker = new inviteTracker(client);
          const messages = new Database(
            "./Maker/Resources/LanguagsProvider.json",
          );
          const Botlanguage = new Database("/Database/Others/Language.json");
          const logdb = require("./lib/featureDb")("sys_log");
          const protectiondb = require("./lib/featureDb")("protection");
          tracker.on(
            "guildMemberAdd",
            async (member, inviter, invite, error) => {
              try {
                const guildStats = require('../src/shared/services/guildStats');
                guildStats.increment(
                  client.user?.id,
                  member?.guild?.id,
                  'joins',
                  member?.guild?.memberCount,
                );
              } catch (_) {}
              try {
                const { sendSystemWelcome } = require('./lib/systemWelcome');
                await sendSystemWelcome(client, member);
              } catch (err) {
                console.warn(
                  `[Maker] system welcome failed: ${err?.message || err}`,
                );
              }
              try {
                const { applySystemAutoRoles } = require('./lib/systemAutoRoles');
                await applySystemAutoRoles(client, member);
              } catch (err) {
                console.warn(
                  `[Maker] system auto-roles failed: ${err?.message || err}`,
                );
              }

              try {
                const { handleMemberAdd } = require('./lib/protectionAdvanced');
                await handleMemberAdd(client, member);
              } catch (err) {
                console.warn(
                  `[Maker] protection advanced join failed: ${err?.message || err}`,
                );
              }

              const commandsdb = new Database(
                `/Database/CommandsData/BotsCommands_${client.user.id}.json`,
              );
              const language = (await Botlanguage.get(client.user.id)) || "En";
              const reply = await messages.get(language);
              let inviterUser;
              let log1 =
                logdb.get(
                  "member-joined_" + member?.guild?.id + "_" + client.user.id,
                ) || null;

              if (member?.user?.id == inviter?.id) inviterUser = null;
              inviterUser = inviter;
              if (log1) {
                let channel =
                  (await member?.guild?.channels.cache.get(log1.channel)) ||
                  (await member?.guild?.channels.fetch(log1.channel).catch());
                if (!channel) {
                  /* skip log only — do not abort join pipeline */
                } else {
                let embed = new EmbedBuilder()
                  .setColor(log1.color || "Green")
                  .setThumbnail(member.user.avatarURL({ dynamic: true }))
                  .setAuthor({
                    name: member.user.username,
                    iconURL: member.user.avatarURL({ dynamic: true }),
                  })
                  .setFooter({
                    iconURL: member?.guild?.iconURL({ dynamic: true }),
                    text: member?.guild?.name,
                  })
                  .setTimestamp()
                  .setDescription(
                    reply.Log.Reply14.replace("[USER]", member.user),
                  )
                  .addFields({
                    name: reply.Log.Field3.name,
                    value: reply.Log.Field3.value.replace(
                      "[DATE]",
                      "<t:" +
                        Math.floor(member.user.createdAt.getTime() / 1000) +
                        ":R>",
                    ),
                    inline: true,
                  });
                if (inviterUser) {
                  embed.addFields({
                    name: reply.Log.Field4.name,
                    value: reply.Log.Field4.value.replace(
                      "[INVITER]",
                      inviterUser,
                    ),
                    inline: true,
                  });
                }
                channel.send({ embeds: [embed] });
                }
              }

              let botCommands =
                commandsdb.get("commands_" + client.user.id) || [];
              const hasProtection = botCommands.some(
                (command) => command.type == "Protection",
              );
              if (hasProtection) {
                if (member.user.bot) {
                  if (
                    inviter.id == client.user.id ||
                    inviter.id == member?.guild?.ownerId
                  ) {
                  } else {
                    let status =
                      protectiondb.get(
                        "antiBots_" + member.guild.id + "_" + client.user.id,
                      ) || "on";
                    if (status == "on") {
                      member.kick().catch((err) => {});
                    }
                    let limit =
                      protectiondb.get(
                        "actionLimit_" +
                          "add_bots_" +
                          member?.guild?.id +
                          "_" +
                          client.user.id,
                      ) || 3;
                    let automode =
                      protectiondb.get(
                        "autoMode_" +
                          "add_bots_" +
                          member?.guild?.id +
                          "_" +
                          client.user.id,
                      ) || "delete_roles";
                    let whitelistCheck =
                      protectiondb.get(
                        "whiteList_" +
                          member?.guild?.id +
                          "_" +
                          member.id +
                          "_" +
                          client.user.id,
                      ) || [];
                    let logID =
                      protectiondb.get(
                        "protectionLog_" +
                          member?.guild?.id +
                          "_" +
                          client.user.id,
                      ) || null;
                    if (
                      whitelistCheck &&
                      (whitelistCheck.includes("add_bots") ||
                        whitelistCheck.includes("all"))
                    ) {
                      if (logID) {
                        let log = member?.guild?.channels.cache.get(logID);
                        if (log) {
                          let embed = new EmbedBuilder()
                            .setColor("Red")
                            .setThumbnail(
                              member.user.avatarURL({ dynamic: true }),
                            )
                            .setAuthor({
                              name: member.user.username,
                              iconURL: member.user.avatarURL({ dynamic: true }),
                            })
                            .setFooter({
                              iconURL: inviter.avatarURL({ dynamic: true }),
                              text: inviter.username,
                            })
                            .setTimestamp()
                            .setDescription(
                              reply.Protection.Reply13.replace(
                                "[BOT]",
                                member.user,
                              )
                                .replace("[AUTHOR]", inviterUser)
                                .replace(
                                  "[TIMES]",
                                  reply.Protection.Whitelist.yes,
                                ),
                            );
                          log.send({ embeds: [embed] });
                        }
                      }
                    } else {
                      let userData =
                        protectiondb.get(
                          "protectionData_" +
                            "add_bots_" +
                            member?.guild?.id +
                            "_" +
                            inviter.id +
                            "_" +
                            client.user.id,
                        ) || 0;
                      let timeLeft = limit - userData;

                      if (logID) {
                        let log = member?.guild?.channels.cache.get(logID);
                        if (log) {
                          let embed = new EmbedBuilder()
                            .setColor("Red")
                            .setThumbnail(
                              member.user.avatarURL({ dynamic: true }),
                            )
                            .setAuthor({
                              name: member.user.username,
                              iconURL: member.user.avatarURL({ dynamic: true }),
                            })
                            .setFooter({
                              iconURL: inviter.avatarURL({ dynamic: true }),
                              text: inviter.username,
                            })
                            .setTimestamp()
                            .setDescription(
                              reply.Protection.Reply10.replace(
                                "[USER]",
                                member.user,
                              )
                                .replace("[AUTHOR]", inviter)
                                .replace("[ACTION]", "added")
                                .replace("[TIMES]", timeLeft),
                            );
                          log.send({ embeds: [embed] });
                        }
                      }
                      protectiondb.set(
                        "protectionData_" +
                          "add_bots_" +
                          member?.guild?.id +
                          "_" +
                          inviter.id +
                          "_" +
                          client.user.id,
                        userData + 1,
                      );
                      if (userData >= limit) {
                        let done = false;
                        if (automode === "delete_roles") {
                          const user = member?.guild?.members.cache.get(
                            inviter.id,
                          );
                          if (user) {
                            user.roles.cache.forEach(async (r) => {
                              await user.roles
                                .remove(r)
                                .then(() => {
                                  done = true;
                                })
                                .catch((err) => {});
                            });
                          }
                        } else if (automode == "kick") {
                          const user = member?.guild?.members.cache.get(
                            inviter.id,
                          );
                          user
                            .kick()
                            .then(() => {
                              done = true;
                            })
                            .catch((err) => {});
                        } else if (automode == "ban") {
                          const user = member?.guild?.members.cache.get(
                            inviter.id,
                          );
                          user
                            .ban()
                            .then(() => {
                              done = true;
                            })
                            .catch((err) => {});
                        }
                        let serverOwner = member?.guild?.members.cache.get(
                          member?.guild?.ownerId,
                        );
                        setTimeout(() => {
                          if (serverOwner && done == true) {
                            let embed = new EmbedBuilder()
                              .setColor("Green")
                              .setFooter({ text: reply.Others.Powered })
                              .setTimestamp()
                              .setDescription(
                                reply.Protection.OwnerMSG.Desc.replace(
                                  "[OWNER]",
                                  serverOwner,
                                ),
                              )
                              .addFields(
                                {
                                  name: reply.Protection.OwnerMSG.Fileds.Field1
                                    .name,
                                  value:
                                    reply.Protection.OwnerMSG.Fileds.Field1.value.replace(
                                      "[GUILDNAME]",
                                      member?.guild?.name,
                                    ),
                                },
                                {
                                  name: reply.Protection.OwnerMSG.Fileds.Field2
                                    .name,
                                  value:
                                    reply.Protection.OwnerMSG.Fileds.Field2.value.replace(
                                      "[USER_MENTION]",
                                      inviter,
                                    ),
                                },
                                {
                                  name: reply.Protection.OwnerMSG.Fileds.Field3
                                    .name,
                                  value:
                                    reply.Protection.OwnerMSG.Fileds.Field3.value.replace(
                                      "[USER_ID]",
                                      inviter.id,
                                    ),
                                },
                                {
                                  name: reply.Protection.OwnerMSG.Fileds.Field4
                                    .name,
                                  value:
                                    reply.Protection.OwnerMSG.Fileds.Field4.value.replace(
                                      "[ACTION]",
                                      "Adding bots",
                                    ),
                                },
                              );
                            serverOwner.send({ embeds: [embed] });
                          }
                        }, 1000);
                      }
                    }
                  }
                }
              }
            },
          );

          global.bots[botID] = client;

          try {
            // Attach before login so ready.js actually runs (login resolves after ready)
            const attachPath = require('path').join(__dirname, '..', 'src', 'bots', 'attachHandlers.js');
            const attachKey = require('path').resolve(attachPath).replace(/\\/g, '/').toLowerCase();
            for (const key of Object.keys(require.cache)) {
              if (key.replace(/\\/g, '/').toLowerCase() === attachKey) {
                delete require.cache[key];
              }
            }
            const { attachCustomerBotHandlers } = require("../src/bots/attachHandlers");
            attachCustomerBotHandlers(client);

            // Register thin slash wrappers for prefix-only commands (help/line, etc.)
            try {
              const { createPrefixSlashWrapper } = require('../src/shared/commands/interactionBridge');
              for (const com of botCommands) {
                if (!com?.slash_commandName) continue;
                const slashName = String(com.slash_commandName);
                if (client.slashcommands.has(slashName)) continue;
                const prefixName = String(com.prefix_commandName || com.name || '');
                const prefixCmd = prefixName
                  ? client.commands.get(prefixName)
                  : null;
                if (!prefixCmd || typeof prefixCmd.run !== 'function') continue;
                const wrapper = createPrefixSlashWrapper(prefixCmd, slashName);
                slashcommands.push(wrapper.data);
                client.slashcommands.set(slashName, wrapper);
              }
            } catch (wrapErr) {
              console.warn(
                `[Maker] ${botID} prefix→slash wrap: ${wrapErr?.message || wrapErr}`,
              );
            }

            await client.login(token);
            global.loggedInTokens.add(token);
            global.botNotReadySince.delete(botID);
            clearLoginBackoff(botID);
            global.botLoginNextOk?.delete(botID);
          } catch (err) {
            console.error(`❌ ${botID} Login Error: ${err.message}`);
            try {
              await client.destroy();
            } catch {
              /* ignore */
            }
            delete global.bots[botID];
            global.loggedInTokens.delete(token);
            global.botNotReadySince.delete(botID);

            if (isFatalTokenError(err)) {
              console.warn(`[Maker] ${botID} invalid token — setting runtime=off`);
              try {
                const { runtimes } = require('../src/shared/services/mainDb');
                await runtimes.setRunning(botID, false);
              } catch {
                /* ignore */
              }
              clearLoginBackoff(botID);
            } else if (isNetworkLoginError(err)) {
              bumpLoginBackoff(botID);
              const wait = loginBackoffMs(botID);
              if (!global.botLoginNextOk) global.botLoginNextOk = new Map();
              global.botLoginNextOk.set(botID, Date.now() + wait);
              console.warn(
                `[Maker] ${botID} network login failure — retry in ${Math.round(wait / 1000)}s`,
              );
            }
          } finally {
            global.loggingInTokens.delete(token);
          }
        }
      } else {
        await stopCustomerBot(botID, token);
      }
    }
  } catch (err) {
    console.error("❌ Manager Error:", err);
  }
};

getScheduler().every(MANAGER_TICK_MS, managerTick, { name: "manager-tick", scope: "process" });

// Periodic integrity + care for Maker-created bots (BotInstance / BotRuntime / live report)
try {
  startBotHealthSupervisor({ forceCustomerReconnect });
} catch (err) {
  console.warn(`[Maker] bot health supervisor failed to start: ${err.message}`);
}

// BullMQ workers: Dashboard → Discord jobs (skipped if Redis down)
try {
  const { startMakerQueueWorkers } = require('./lib/queueWorkers');
  void startMakerQueueWorkers({
    getClient: (botClientId) => global.bots[String(botClientId)] || null,
  }).catch((err) => {
    console.warn(`[Maker] queue workers failed to start: ${err.message}`);
  });
} catch (err) {
  console.warn(`[Maker] queue workers failed to start: ${err.message}`);
}

