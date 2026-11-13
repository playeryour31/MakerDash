/**
 * Drop-in feature DB for Maker handlers — Postgres/featureCache only (no JSON writes).
 */
const featureCache = require('../../src/shared/services/featureCache');

const NAMESPACES = new Set([
  'ticket',
  'temp_ticket',
  'protection',
  'giveaway',
  'autoline',
  'azkar',
  'quran',
  'broadcast',
  'feedback',
  'offer',
  'selfrole',
  'shop',
  'stock_db',
  'suggestion',
  'tax',
  'temp_channels',
  'temp_role',
  'temp_voice',
  'sys_log',
  'sys_reply',
  'sys_selfrole',
  'sys_stock',
  'sys_userdata',
  'sys_voicetemp',
  'sys_welcome',
  'sys_auto_responder',
  'sys_auto_roles',
  'sys_leveling',
  'sys_reaction_roles',
]);

module.exports = function createFeatureDb(namespace) {
  const ns = NAMESPACES.has(namespace) ? namespace : String(namespace || 'misc');
  const pgDb = featureCache.createFeatureDb(ns);

  return {
    get(key) {
      return pgDb.get(key);
    },
    set(key, value) {
      return pgDb.set(key, value);
    },
    delete(key) {
      return pgDb.delete(key);
    },
    push(key, value) {
      return pgDb.push(key, value);
    },
    pull(key, value) {
      if (typeof pgDb.pull === 'function') return pgDb.pull(key, value);
      return pgDb.delete(key);
    },
    has(key) {
      return pgDb.get(key) !== undefined;
    },
    /** st.db-compatible: [{ ID, data }, ...] */
    all(limit = 0) {
      const rows = typeof pgDb.all === 'function' ? pgDb.all() : [];
      const list = Array.isArray(rows)
        ? rows
        : Object.entries(rows || {}).map(([ID, data]) => ({ ID, data }));
      return limit > 0 ? list.slice(0, limit) : list;
    },
    fetchAll(limit = 0) {
      return this.all(limit);
    },
  };
};
