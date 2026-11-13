const fs = require('fs');
const path = require('path');

/**
 * Load modules from nested folders into a Discord.js Collection-like Map.
 * Expected export shape: { name: string, run: Function, ... }
 *
 * @param {Map|import('discord.js').Collection} collection
 * @param {string} basePath Absolute path to the root folder (Buttons/Modals/...)
 * @param {object} [options]
 * @param {string} [options.label='Loader'] Log label
 * @param {boolean} [options.requireRun=true] Require a run() function
 * @returns {number} Loaded count
 */
function loadCollectionFromFolders(collection, basePath, options = {}) {
  const label = options.label || 'Loader';
  const requireRun = options.requireRun !== false;

  if (!collection || typeof collection.set !== 'function') {
    throw new Error(`[${label}] Invalid collection provided`);
  }

  const resolvedBase = path.resolve(basePath);

  if (!fs.existsSync(resolvedBase)) {
    console.warn(`[${label}] Path not found: ${resolvedBase}`);
    return 0;
  }

  let loaded = 0;
  const folders = fs.readdirSync(resolvedBase).filter((folder) => {
    const full = path.join(resolvedBase, folder);
    return fs.statSync(full).isDirectory();
  });

  for (const folder of folders) {
    const folderPath = path.join(resolvedBase, folder);
    const files = fs.readdirSync(folderPath).filter((file) => file.endsWith('.js'));

    for (const file of files) {
      const modulePath = path.resolve(folderPath, file);

      let mod;
      try {
        delete require.cache[modulePath];
        mod = require(modulePath);
      } catch (err) {
        console.error(`[${label}] Failed to load ${modulePath}:`, err);
        continue;
      }

      if (!mod?.name) {
        console.log(`[${label}] Invalid module (missing name): ${modulePath}`);
        continue;
      }

      if (requireRun && typeof mod.run !== 'function') {
        console.log(`[${label}] Invalid module (missing run): ${modulePath}`);
        continue;
      }

      collection.set(mod.name, mod);
      loaded += 1;
    }
  }

  return loaded;
}

module.exports = { loadCollectionFromFolders };
