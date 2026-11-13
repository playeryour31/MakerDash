const platformCache = require('../platformCache');

/**
 * Platform KV namespace accessor (sync after hydrate).
 */
function kv(namespace) {
  const db = platformCache.createPlatformDb(String(namespace));
  return {
    get(key) {
      return db.get(String(key));
    },
    set(key, value) {
      return db.set(String(key), value);
    },
    delete(key) {
      return db.delete(String(key));
    },
    has(key) {
      return db.has(String(key));
    },
    push(key, value) {
      return db.push(String(key), value);
    },
    pull(key, value) {
      return db.pull(String(key), value);
    },
    all() {
      return db.all() || [];
    },
  };
}

module.exports = { kv };
