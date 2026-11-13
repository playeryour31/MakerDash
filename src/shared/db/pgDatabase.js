/**
 * st.db-compatible Database that routes mutable paths to PostgreSQL.
 * Catalog paths (Main/Resources) keep the real st.db file backend (read-only intent).
 */
const { resolveStore } = require('./pathMap');
const platformCache = require('../services/platformCache');
const featureCache = require('../services/featureCache');

let realStDb = null;
function getRealStDb() {
  if (!realStDb) realStDb = require('st.db');
  return realStDb;
}

function legacyBotToJson(row) {
  if (!row) return null;
  // BotInstance repository already has mappers; keep a minimal shape for Tokens.Bots
  if (row.ClientID || row.Token) return row;
  return {
    ClientID: row.clientId,
    Token: row.tokenEnc || row.Token,
    Owner: row.ownerId,
    Buyer: row.buyerId,
    Seller: row.sellerId,
    BotID: row.botNumber,
    Type: row.type,
    Servers: row.servers || [],
    Server: row.serverId || row.guildId,
    guild: row.guildId,
    Price: row.price,
    PurchasesID: row.purchasesId,
    TokenType: row.tokenType,
    endTime: row.endsAt,
    startTime: row.startsAt,
    language: row.language,
  };
}

class PgDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.store = resolveStore(filePath);
    this._catalog = null;
    if (this.store.kind === 'catalog') {
      const { Database } = getRealStDb();
      this._catalog = new Database(filePath);
    }
  }

  _featureDb() {
    return featureCache.createFeatureDb(this.store.namespace);
  }

  _platformDb() {
    return platformCache.createPlatformDb(this.store.namespace);
  }

  get(key) {
    const k = String(key);
    if (this._catalog) return this._catalog.get(k);

    if (this.store.kind === 'feature' || this.store.kind === 'apply_legacy') {
      return this._featureDb().get(k);
    }
    if (this.store.kind === 'platform') {
      return this._platformDb().get(k);
    }
    if (this.store.kind === 'tokens') {
      // Sync path: prefer in-memory overlay from platform cache of last known bots
      // Actual bot list should be read via bot services; keep platform mirror key.
      const mirror = platformCache.createPlatformDb('tokens_mirror');
      if (k === 'Bots') return mirror.get('Bots') || [];
      return mirror.get(k);
    }
    if (this.store.kind === 'runtimes') {
      const db = platformCache.createPlatformDb('bot_runtimes_mirror');
      return db.get(k);
    }
    if (this.store.kind === 'prefixes') {
      const db = platformCache.createPlatformDb('bot_prefixes_mirror');
      return db.get(k);
    }
    if (this.store.kind === 'prices') {
      const db = platformCache.createPlatformDb('guild_bot_prices_mirror');
      return db.get(k);
    }
    if (this.store.kind === 'commands') {
      const db = platformCache.createPlatformDb('bot_command_configs_mirror');
      const clientId = this.store.clientId;
      if (clientId) return db.get(clientId);
      return db.get(k);
    }
    if (this.store.kind === 'token_pool') {
      const db = platformCache.createPlatformDb(`token_pool_${this.store.poolKind}`);
      if (k === 'Tokens' || k === 'TOKENS') return db.get('Tokens') || [];
      return db.get(k);
    }
    return undefined;
  }

  set(key, value) {
    const k = String(key);
    if (this._catalog) {
      // Catalog is read-only by policy — ignore writes
      return value;
    }
    if (this.store.kind === 'feature' || this.store.kind === 'apply_legacy') {
      return this._featureDb().set(k, value);
    }
    if (this.store.kind === 'platform') {
      return this._platformDb().set(k, value);
    }
    if (this.store.kind === 'tokens') {
      const mirror = platformCache.createPlatformDb('tokens_mirror');
      mirror.set(k, value);
      if (k === 'Bots') {
        void this._syncBotsToPrisma(value);
      }
      return value;
    }
    if (this.store.kind === 'runtimes') {
      const db = platformCache.createPlatformDb('bot_runtimes_mirror');
      db.set(k, value);
      void this._syncRuntime(k, Boolean(value));
      return value;
    }
    if (this.store.kind === 'prefixes') {
      const db = platformCache.createPlatformDb('bot_prefixes_mirror');
      db.set(k, value);
      void this._syncPrefix(k, value);
      return value;
    }
    if (this.store.kind === 'prices') {
      const db = platformCache.createPlatformDb('guild_bot_prices_mirror');
      db.set(k, value);
      void this._syncPrice(k, value);
      return value;
    }
    if (this.store.kind === 'commands') {
      const db = platformCache.createPlatformDb('bot_command_configs_mirror');
      const clientId = this.store.clientId || k;
      db.set(clientId, value);
      void this._syncCommands(clientId, value);
      return value;
    }
    if (this.store.kind === 'token_pool') {
      const db = platformCache.createPlatformDb(`token_pool_${this.store.poolKind}`);
      db.set(k, value);
      if (k === 'Tokens' || k === 'TOKENS') {
        void this._syncTokenPool(this.store.poolKind, Array.isArray(value) ? value : []);
      }
      return value;
    }
    return value;
  }

  delete(key) {
    if (this._catalog) return true;
    if (this.store.kind === 'feature' || this.store.kind === 'apply_legacy') {
      return this._featureDb().delete(String(key));
    }
    if (this.store.kind === 'platform') {
      return this._platformDb().delete(String(key));
    }
    // mirrors
    const cur = this.get(key);
    if (cur !== undefined) this.set(key, undefined);
    return true;
  }

  has(key) {
    const v = this.get(key);
    return v !== undefined && v !== null;
  }

  push(key, value) {
    const cur = this.get(key);
    const arr = Array.isArray(cur) ? [...cur] : [];
    arr.push(value);
    this.set(key, arr);
    return arr;
  }

  pull(key, value) {
    const cur = this.get(key);
    if (!Array.isArray(cur)) return this.delete(key);
    const next = cur.filter((x) => x !== value);
    this.set(key, next);
    return next;
  }

  /** st.db-compatible: [{ ID, data }, ...] */
  all(limit = 0) {
    if (this._catalog && typeof this._catalog.all === 'function') {
      return this._catalog.all(limit);
    }
    let rows = [];
    if (this.store.kind === 'feature' || this.store.kind === 'apply_legacy') {
      rows = this._featureDb().all() || [];
    } else if (this.store.kind === 'platform') {
      rows = this._entriesFromMap(this._platformDb());
    } else if (this.store.kind === 'tokens') {
      rows = this._entriesFromMap(
        platformCache.createPlatformDb('tokens_mirror'),
      );
    } else if (this.store.kind === 'runtimes') {
      rows = this._entriesFromMap(
        platformCache.createPlatformDb('bot_runtimes_mirror'),
      );
    } else if (this.store.kind === 'prefixes') {
      rows = this._entriesFromMap(
        platformCache.createPlatformDb('bot_prefixes_mirror'),
      );
    } else if (this.store.kind === 'prices') {
      rows = this._entriesFromMap(
        platformCache.createPlatformDb('guild_bot_prices_mirror'),
      );
    } else if (this.store.kind === 'commands') {
      rows = this._entriesFromMap(
        platformCache.createPlatformDb('bot_command_configs_mirror'),
      );
    } else if (this.store.kind === 'token_pool') {
      rows = this._entriesFromMap(
        platformCache.createPlatformDb(`token_pool_${this.store.poolKind}`),
      );
    }
    const list = Array.isArray(rows)
      ? rows
      : Object.entries(rows || {}).map(([ID, data]) => ({ ID, data }));
    return limit > 0 ? list.slice(0, limit) : list;
  }

  fetchAll(limit = 0) {
    return this.all(limit);
  }

  _entriesFromMap(db) {
    if (!db) return [];
    if (typeof db.all === 'function') {
      const raw = db.all();
      if (Array.isArray(raw)) return raw;
      return Object.entries(raw || {}).map(([ID, data]) => ({ ID, data }));
    }
    return [];
  }

  async _syncBotsToPrisma(bots) {
    try {
      const { prisma } = require('@maker/database');
      // Best-effort: upsert via existing replace is heavy; skip if API owns writes
      if (process.env.USE_BOT_DATA_API === 'true') return;
      const list = Array.isArray(bots) ? bots : [];
      const mirror = platformCache.createPlatformDb('tokens_mirror');
      mirror.set('Bots', list);
      // Keep platform record for recovery
      await prisma.platformRecord.upsert({
        where: { namespace_key: { namespace: 'tokens_mirror', key: 'Bots' } },
        create: { namespace: 'tokens_mirror', key: 'Bots', value: list },
        update: { value: list },
      });
    } catch (err) {
      console.warn(`[pgDatabase] sync bots failed: ${err.message}`);
    }
  }

  async _syncRuntime(clientId, running) {
    try {
      const { prisma } = require('@maker/database');
      await prisma.botRuntime.upsert({
        where: { clientId: String(clientId) },
        create: { clientId: String(clientId), running: Boolean(running) },
        update: { running: Boolean(running) },
      });
    } catch (err) {
      console.warn(`[pgDatabase] sync runtime failed: ${err.message}`);
    }
  }

  async _syncPrefix(key, prefix) {
    try {
      const { prisma } = require('@maker/database');
      const clientId = String(key).replace(/^Prefix_/, '');
      await prisma.botPrefix.upsert({
        where: { clientId },
        create: { clientId, prefix: String(prefix || '#') },
        update: { prefix: String(prefix || '#') },
      });
    } catch (err) {
      console.warn(`[pgDatabase] sync prefix failed: ${err.message}`);
    }
  }

  async _syncPrice(key, price) {
    try {
      const { prisma } = require('@maker/database');
      const m = String(key).match(/^(.*)_(\d{16,20})$/);
      if (!m) {
        await prisma.platformRecord.upsert({
          where: {
            namespace_key: { namespace: 'guild_bot_prices_mirror', key: String(key) },
          },
          create: {
            namespace: 'guild_bot_prices_mirror',
            key: String(key),
            value: price,
          },
          update: { value: price },
        });
        return;
      }
      const priceKey = m[1];
      const guildId = m[2];
      await prisma.guildBotPrice.upsert({
        where: { guildId_priceKey: { guildId, priceKey } },
        create: { guildId, priceKey, price: Number(price) || 0 },
        update: { price: Number(price) || 0 },
      });
    } catch (err) {
      console.warn(`[pgDatabase] sync price failed: ${err.message}`);
    }
  }

  async _syncCommands(clientId, commands) {
    try {
      const { prisma } = require('@maker/database');
      await prisma.botCommandConfig.upsert({
        where: { clientId: String(clientId) },
        create: {
          clientId: String(clientId),
          commands: Array.isArray(commands) ? commands : [],
        },
        update: { commands: Array.isArray(commands) ? commands : [] },
      });
    } catch (err) {
      console.warn(`[pgDatabase] sync commands failed: ${err.message}`);
    }
  }

  async _syncTokenPool(poolKind, tokens) {
    try {
      const { prisma } = require('@maker/database');
      const kind = poolKind;
      await prisma.$transaction([
        prisma.tokenPoolEntry.deleteMany({ where: { kind } }),
        ...tokens.slice(0, 500).map((token) =>
          prisma.tokenPoolEntry.create({
            data: { kind, token: String(token) },
          }),
        ),
      ]);
    } catch (err) {
      console.warn(`[pgDatabase] sync token pool failed: ${err.message}`);
    }
  }
}

module.exports = { Database: PgDatabase, PgDatabase };
