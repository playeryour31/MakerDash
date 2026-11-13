/**
 * Keep the Main (control) Discord bot online with backoff retries.
 *
 * Important: discord.js `login()` calls `destroy()` on failure, which sets
 * `ws.destroyed = true` permanently. Re-using that Client makes `isReady()`
 * always return false even after a later successful gateway session. We revive
 * the WebSocket manager before each retry so readiness checks work again.
 */
const { createLogger } = require('../../shared/utils/logger');
const { Status } = require('discord.js');

const log = createLogger('Main');

const BACKOFF_MS = [5_000, 15_000, 30_000, 60_000, 120_000];
const MAX_BACKOFF_MS = 120_000;

function isNetworkLoginError(err) {
  const code = String(err?.code || err?.cause?.code || '');
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    msg.includes('connect timeout') ||
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('getaddrinfo')
  );
}

function isFatalTokenError(err) {
  const code = Number(err?.code);
  // DiscordAPIError: invalid token
  return code === 401 || code === 50035 || /invalid.?token/i.test(String(err?.message || ''));
}

/** True when the gateway session is actually usable. */
function isClientLive(client) {
  try {
    if (!client) return false;
    if (typeof client.isReady === 'function' && client.isReady()) return true;
    // Fallback after a prior destroy()+relogin where ws.destroyed stuck true
    return Boolean(client.user && client.readyTimestamp);
  } catch {
    return false;
  }
}

/**
 * After discord.js destroy()-on-failed-login, reset WS so a new login can become Ready.
 */
function reviveWebSocketManager(client) {
  try {
    const ws = client?.ws;
    if (!ws) return;
    ws.destroyed = false;
    if (ws.status === undefined || ws.status === Status.Disconnected) {
      ws.status = Status.Idle;
    }
    // Force connect() to build a fresh @discordjs/ws manager
    if (ws._ws) {
      try {
        void ws._ws.destroy?.({ code: 1000, reason: 'revive' });
      } catch {
        /* ignore */
      }
      ws._ws = null;
    }
  } catch {
    /* ignore */
  }
}

/**
 * @param {import('discord.js').Client} client
 * @param {string} token
 */
function attachMainKeepAlive(client, token) {
  const state = {
    token: String(token),
    loggingIn: false,
    attempt: 0,
    timer: null,
    stopped: false,
  };

  global.mainBot = client;
  global.mainBotKeepAlive = state;

  const clearTimer = () => {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  };

  const scheduleReconnect = (reason) => {
    if (state.stopped || state.loggingIn) return;
    if (isClientLive(client)) return;
    if (state.timer) return; // already scheduled
    clearTimer();
    const delay =
      BACKOFF_MS[Math.min(state.attempt, BACKOFF_MS.length - 1)] || MAX_BACKOFF_MS;
    state.attempt += 1;
    log.warn(
      `reconnect scheduled`,
      `(attempt ${state.attempt}, in ${Math.round(delay / 1000)}s) ${reason || ''}`,
    );
    state.timer = setTimeout(() => {
      void loginWithRetry();
    }, delay);
  };

  async function loginWithRetry() {
    if (state.stopped || state.loggingIn) return;
    if (isClientLive(client)) {
      state.attempt = 0;
      return;
    }
    state.loggingIn = true;
    clearTimer();
    try {
      log.info(
        state.attempt === 0
          ? 'logging in to Discord gateway…'
          : `reconnect attempt ${state.attempt}…`,
      );
      reviveWebSocketManager(client);
      await client.login(state.token);
      state.attempt = 0;
    } catch (err) {
      if (isFatalTokenError(err)) {
        log.error(`fatal token error — stopping keepAlive: ${err.message}`);
        state.stopped = true;
        return;
      }
      log.error(`login failed: ${err.message || err}`);
      state.loggingIn = false;
      reviveWebSocketManager(client);
      // Every non-fatal login failure retries: network errors, rate limits and
      // Discord 5xx all benefit from backoff. Only fatal token errors stop.
      scheduleReconnect(err.code || err.message);
      return;
    } finally {
      state.loggingIn = false;
    }
  }

  client.on('ready', () => {
    state.attempt = 0;
    clearTimer();
    log.success(
      `${client.user?.username || 'Main'} online`,
      `(${client.user?.id || ''})`,
    );
  });

  client.on('shardDisconnect', (_event, shardId) => {
    log.warn(`shardDisconnect`, `shard=${shardId}`);
    scheduleReconnect('shardDisconnect');
  });

  client.on('invalidated', () => {
    log.error('session invalidated — will retry login');
    scheduleReconnect('invalidated');
  });

  client.on('error', (err) => {
    log.error(`client error: ${err?.message || err}`);
    if (!isClientLive(client)) {
      scheduleReconnect('client error');
    }
  });

  // Kick off first login
  void loginWithRetry();

  return {
    loginWithRetry,
    scheduleReconnect,
    stop() {
      state.stopped = true;
      clearTimer();
    },
    isLive: () => isClientLive(client),
  };
}

module.exports = {
  attachMainKeepAlive,
  isNetworkLoginError,
  isFatalTokenError,
  isClientLive,
  reviveWebSocketManager,
};
