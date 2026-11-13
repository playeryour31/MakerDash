/**
 * st.db-compatible Database for Main handlers — backed by mainDb / Prisma caches.
 * Catalog paths under Main/Resources are loaded via require() (read-only).
 */
const path = require('path');
const fs = require('fs');
const { resolveStore, normalizePath } = require('../../db/pathMap');
const botsService = require('./botsService');
const runtimeService = require('./runtimeService');
const pricesService = require('./pricesService');
const prefixService = require('./prefixService');
const tokenPoolService = require('./tokenPoolService');
const commandsConfigService = require('./commandsConfigService');
const { kv } = require('./platformKv');

const catalogCache = new Map();

function loadCatalog(filePath) {
  const p = normalizePath(filePath);
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath.replace(/^\//, ''));
  const key = abs;
  if (catalogCache.has(key)) return catalogCache.get(key);
  let data = {};
  try {
    if (fs.existsSync(abs)) {
      data = JSON.parse(fs.readFileSync(abs, 'utf8') || '{}') || {};
    } else {
      // try relative to repo Main/Resources
      const alt = path.resolve(process.cwd(), p);
      if (fs.existsSync(alt)) {
        data = JSON.parse(fs.readFileSync(alt, 'utf8') || '{}') || {};
      }
    }
  } catch {
    data = {};
  }
  catalogCache.set(key, data);
  return data;
}

class Database {
  constructor(filePath) {
    this.filePath = filePath;
    this.store = resolveStore(filePath) || { kind: 'platform', namespace: 'misc' };
    this._catalog = null;
    if (this.store.kind === 'catalog') {
      this._catalog = loadCatalog(filePath);
    }
  }

  get(key) {
    const k = String(key);
    if (this._catalog) return this._catalog[k];

    switch (this.store.kind) {
      case 'tokens':
        if (k === 'Bots') return botsService.listBotsSync();
        return kv('tokens_mirror').get(k);
      case 'runtimes':
        return runtimeService.getMapSync()[k];
      case 'prefixes':
        return prefixService.getSync(k);
      case 'prices':
        return pricesService.getSync(k);
      case 'commands': {
        const clientId = this.store.clientId;
        if (clientId) return commandsConfigService.getCommandsKeySync(clientId, k);
        return commandsConfigService.getSync(k);
      }
      case 'token_pool': {
        if (k === 'Tokens' || k === 'TOKENS') {
          return tokenPoolService.listSync(this.store.poolKind);
        }
        return kv(`token_pool_${this.store.poolKind}`).get(k);
      }
      case 'feature':
      case 'apply_legacy':
        // Main should not use feature DBs heavily; route via platform-like cache if needed
        return kv(this.store.namespace || 'misc').get(k);
      case 'platform':
      default:
        return kv(this.store.namespace || 'misc').get(k);
    }
  }

  set(key, value) {
    const k = String(key);
    if (this._catalog) {
      // read-only catalog — still Promise-compatible for legacy .then()
      return Promise.resolve(value);
    }

    let result;
    switch (this.store.kind) {
      case 'tokens':
        result =
          k === 'Bots'
            ? botsService.setAllBotsSync(value)
            : kv('tokens_mirror').set(k, value);
        break;
      case 'runtimes':
        result = runtimeService.setRunningSync(k, Boolean(value));
        break;
      case 'prefixes':
        result = prefixService.setSync(k, value);
        break;
      case 'prices':
        result = pricesService.setSync(k, value);
        break;
      case 'commands': {
        const clientId = this.store.clientId || k;
        result = commandsConfigService.setCommandsKeySync(clientId, k, value);
        break;
      }
      case 'token_pool': {
        if (k === 'Tokens' || k === 'TOKENS') {
          result = tokenPoolService.setTokensSync(this.store.poolKind, value);
        } else {
          result = kv(`token_pool_${this.store.poolKind}`).set(k, value);
        }
        break;
      }
      case 'feature':
      case 'apply_legacy':
        result = kv(this.store.namespace || 'misc').set(k, value);
        break;
      case 'platform':
      default:
        result = kv(this.store.namespace || 'misc').set(k, value);
        break;
    }
    // Legacy Main handlers chain .then() like st.db
    return Promise.resolve(result);
  }

  delete(key) {
    if (this._catalog) return Promise.resolve(true);
    const k = String(key);
    if (this.store.kind === 'token_pool' && (k === 'Tokens' || k === 'TOKENS')) {
      tokenPoolService.setTokensSync(this.store.poolKind, []);
      return Promise.resolve(true);
    }
    if (this.store.kind === 'runtimes') {
      runtimeService.setRunningSync(k, false);
      return Promise.resolve(true);
    }
    if (this.store.kind === 'tokens' && k === 'Bots') {
      botsService.setAllBotsSync([]);
      return Promise.resolve(true);
    }
    const ns =
      this.store.kind === 'platform' || this.store.kind === 'feature'
        ? this.store.namespace
        : this.store.kind === 'token_pool'
          ? `token_pool_${this.store.poolKind}`
          : this.store.kind === 'tokens'
            ? 'tokens_mirror'
            : this.store.namespace || 'misc';
    return Promise.resolve(kv(ns || 'misc').delete(k));
  }

  has(key) {
    const v = this.get(key);
    return v !== undefined && v !== null;
  }

  push(key, value) {
    if (this.store.kind === 'token_pool' && (key === 'Tokens' || key === 'TOKENS')) {
      return Promise.resolve(tokenPoolService.addSync(this.store.poolKind, value));
    }
    const cur = this.get(key);
    const arr = Array.isArray(cur) ? [...cur] : [];
    arr.push(value);
    this.set(key, arr);
    return Promise.resolve(arr);
  }

  pull(key, value) {
    if (this.store.kind === 'token_pool' && (key === 'Tokens' || key === 'TOKENS')) {
      tokenPoolService.removeSync(this.store.poolKind, value);
      return Promise.resolve(tokenPoolService.listSync(this.store.poolKind));
    }
    const cur = this.get(key);
    if (!Array.isArray(cur)) return this.delete(key);
    const next = cur.filter((x) => x !== value);
    this.set(key, next);
    return Promise.resolve(next);
  }

  all(limit = 0) {
    if (this._catalog) {
      const rows = Object.entries(this._catalog).map(([ID, data]) => ({ ID, data }));
      return limit > 0 ? rows.slice(0, limit) : rows;
    }
    if (this.store.kind === 'tokens') {
      return [{ ID: 'Bots', data: botsService.listBotsSync() }];
    }
    if (this.store.kind === 'runtimes') {
      const map = runtimeService.getMapSync();
      const rows = Object.entries(map).map(([ID, data]) => ({ ID, data }));
      return limit > 0 ? rows.slice(0, limit) : rows;
    }
    if (this.store.kind === 'prices') {
      return pricesService.allSync();
    }
    if (this.store.kind === 'prefixes') {
      return prefixService.allSync();
    }
    if (this.store.kind === 'token_pool') {
      return [
        {
          ID: 'Tokens',
          data: tokenPoolService.listSync(this.store.poolKind),
        },
      ];
    }
    const ns = this.store.namespace || 'misc';
    const rows = kv(ns).all();
    return limit > 0 ? rows.slice(0, limit) : rows;
  }

  fetchAll(limit = 0) {
    return this.all(limit);
  }
}

module.exports = { Database };
