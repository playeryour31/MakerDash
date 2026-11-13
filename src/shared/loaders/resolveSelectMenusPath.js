const fs = require('fs');
const path = require('path');

/**
 * Prefer SelectMenus; keep Selectmenu as temporary alias.
 */
function resolveSelectMenusPath(rootDir) {
  const preferred = path.join(rootDir, 'SelectMenus');
  const legacy = path.join(rootDir, 'Selectmenu');
  if (fs.existsSync(preferred)) return preferred;
  return legacy;
}

module.exports = { resolveSelectMenusPath };
