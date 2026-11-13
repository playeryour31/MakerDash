/**
 * Install require('st.db') shim so Discord bots use Postgres-backed Database.
 * Call once at process start before loading Main/Maker handlers.
 */
const Module = require('module');
const path = require('path');

let installed = false;

function installStDbBridge() {
  if (installed) return;
  installed = true;

  const bridgePath = path.join(__dirname, 'pgDatabase.js');
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'st.db') {
      // Avoid recursion when pgDatabase loads real st.db for catalogs
      const parentFile = parent && parent.filename ? String(parent.filename) : '';
      if (parentFile.includes(`${path.sep}pgDatabase.js`) || parentFile.includes('/pgDatabase.js')) {
        return originalLoad.apply(this, arguments);
      }
      return require(bridgePath);
    }
    return originalLoad.apply(this, arguments);
  };
}

module.exports = { installStDbBridge };
