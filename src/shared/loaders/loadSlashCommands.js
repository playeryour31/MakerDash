const fs = require('fs');
const path = require('path');

/**
 * Load slash command modules from nested folders.
 * Expected export shape: { data: SlashCommandBuilder|JSON, run: Function, ... }
 *
 * @param {Map|import('discord.js').Collection} collection
 * @param {string} basePath Absolute path to SlashCommands root
 * @param {object} [options]
 * @param {string} [options.label='SlashCommands Loader']
 * @param {(command: object) => boolean} [options.filter] Optional filter; return false to skip
 * @returns {{ loaded: number, body: object[] }} Loaded count and REST body payloads
 */
function loadSlashCommands(collection, basePath, options = {}) {
  const label = options.label || 'SlashCommands Loader';
  const filter = typeof options.filter === 'function' ? options.filter : () => true;
  const body = [];

  if (!collection || typeof collection.set !== 'function') {
    throw new Error(`[${label}] Invalid collection provided`);
  }

  const resolvedBase = path.resolve(basePath);

  if (!fs.existsSync(resolvedBase)) {
    console.warn(`[${label}] Path not found: ${resolvedBase}`);
    return { loaded: 0, body };
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

      let command;
      try {
        command = require(modulePath);
      } catch (err) {
        console.error(`[${label}] Failed to load ${modulePath}:`, err);
        continue;
      }

      if (!command?.data?.name) {
        console.log(`[${label}] Invalid slash command (missing data.name): ${modulePath}`);
        continue;
      }

      if (!filter(command)) continue;

      const payload = typeof command.data.toJSON === 'function' ? command.data.toJSON() : command.data;
      body.push(payload);
      collection.set(command.data.name, command);
      loaded += 1;
    }
  }

  return { loaded, body };
}

module.exports = { loadSlashCommands };
