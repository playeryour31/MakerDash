/**
 * HTTP client for Discord bots → Nest internal API (Phase 1 data plane).
 * Short TTL cache for bots list + runtime map to protect Maker manager loop.
 */
const fetch = (...args) =>
  import('node-fetch').then(({ default: f }) => f(...args));

const DEFAULT_TTL_MS = 2500;

function baseUrl() {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.API_URL ||
    'http://127.0.0.1:3011/api'
  ).replace(/\/$/, '');
}

function apiKey() {
  return (
    process.env.BOT_INTERNAL_API_KEY ||
    process.env.PROVISION_API_KEY ||
    ''
  );
}

function useApi() {
  const flag = String(process.env.USE_BOT_DATA_API || '').toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

let botsCache = { at: 0, data: null };
let runtimeCache = { at: 0, data: null };

async function request(method, path, body) {
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-bot-internal-key': apiKey(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    timeout: 15000,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`botDataClient ${method} ${path} → ${res.status} ${text}`);
  }
  return res.json();
}

async function listBots({ force = false, includeToken = true } = {}) {
  const now = Date.now();
  if (!force && botsCache.data && now - botsCache.at < DEFAULT_TTL_MS) {
    return botsCache.data;
  }
  const data = await request(
    'GET',
    `/internal/bots?includeToken=${includeToken ? '1' : '0'}`,
  );
  botsCache = { at: now, data: data.bots || [] };
  return botsCache.data;
}

async function getRuntimeMap({ force = false } = {}) {
  const now = Date.now();
  if (!force && runtimeCache.data && now - runtimeCache.at < DEFAULT_TTL_MS) {
    return runtimeCache.data;
  }
  const data = await request('GET', '/internal/runtime');
  runtimeCache = { at: now, data: data.runtime || {} };
  return runtimeCache.data;
}

async function isRunning(clientId) {
  const map = await getRuntimeMap();
  if (Object.prototype.hasOwnProperty.call(map, String(clientId))) {
    return Boolean(map[String(clientId)]);
  }
  const data = await request('GET', `/internal/bots/${clientId}/runtime`);
  return Boolean(data.running);
}

async function setRunning(clientId, running) {
  runtimeCache = { at: 0, data: null };
  return request('PATCH', `/internal/bots/${clientId}/runtime`, {
    running: Boolean(running),
  });
}

async function applyGet(key) {
  const data = await request(
    'GET',
    `/internal/apply/kv?key=${encodeURIComponent(key)}`,
  );
  return data.value;
}

async function applySet(key, value) {
  return request('POST', '/internal/apply/kv', { key, value });
}

async function applyDelete(key) {
  return request('POST', '/internal/apply/kv/delete', { key });
}

async function claimJobs(clientId, limit = 20) {
  const data = await request(
    'GET',
    `/internal/bots/${clientId}/jobs/claim?limit=${limit}`,
  );
  return data.jobs || [];
}

async function completeJob(clientId, jobId, ok = true, error) {
  return request('POST', `/internal/bots/${clientId}/jobs/${jobId}/complete`, {
    ok,
    error,
  });
}

/**
 * st.db-compatible facade for Apply.json keys (async).
 * Handlers should prefer await applyDb.get/set/delete.
 */
function createApplyDbFacade() {
  return {
    async get(key) {
      return applyGet(key);
    },
    async set(key, value) {
      await applySet(key, value);
      return value;
    },
    async delete(key) {
      await applyDelete(key);
      return true;
    },
  };
}

module.exports = {
  useApi,
  listBots,
  getRuntimeMap,
  isRunning,
  setRunning,
  applyGet,
  applySet,
  applyDelete,
  claimJobs,
  completeJob,
  createApplyDbFacade,
  invalidateCaches() {
    botsCache = { at: 0, data: null };
    runtimeCache = { at: 0, data: null };
  },
};
