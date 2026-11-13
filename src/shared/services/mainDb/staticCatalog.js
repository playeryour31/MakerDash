/**
 * Read-only wrapper around a static JSON catalog (Bots.json / Commands.json).
 * Preserves st.db-like .get / .all for Main handlers without treating files as a DB.
 */
function fromObject(data) {
  const obj = data && typeof data === 'object' ? data : {};
  return {
    get(key) {
      return obj[String(key)];
    },
    has(key) {
      return Object.prototype.hasOwnProperty.call(obj, String(key));
    },
    all() {
      return Object.entries(obj).map(([ID, value]) => ({ ID, data: value }));
    },
    set() {
      return undefined;
    },
    delete() {
      return true;
    },
    push() {
      return [];
    },
    pull() {
      return [];
    },
  };
}

function fromRequire(absOrRelModule) {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return fromObject(require(absOrRelModule));
}

module.exports = { fromObject, fromRequire };
