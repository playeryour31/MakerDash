const fs = require('fs');
const path = require('path');

/**
 * Load Discord event modules from a flat Events directory.
 * Expected export shape: { event?: string, run: Function }
 *
 * @param {import('discord.js').Client} client
 * @param {string} eventsDir Absolute path
 * @param {object} [options]
 * @param {string} [options.label='Events Loader']
 * @returns {number} Loaded count
 */
function loadEvents(client, eventsDir, options = {}) {
  const label = options.label || 'Events Loader';

  const resolvedDir = path.resolve(eventsDir);

  if (!fs.existsSync(resolvedDir)) {
    console.warn(`[${label}] Path not found: ${resolvedDir}`);
    return 0;
  }

  let loaded = 0;
  const files = fs.readdirSync(resolvedDir).filter((file) => file.endsWith('.js'));

  for (const file of files) {
    const modulePath = path.resolve(resolvedDir, file);

    // Windows path casing (H:\ vs h:\) can leave stale entries in require.cache
    const normalizedTarget = modulePath.replace(/\\/g, '/').toLowerCase();
    for (const key of Object.keys(require.cache)) {
      if (key.replace(/\\/g, '/').toLowerCase() === normalizedTarget) {
        delete require.cache[key];
      }
    }

    let mod;
    try {
      mod = require(modulePath);
    } catch (err) {
      console.error(`[${label}] Failed to load ${modulePath}:`, err);
      continue;
    }

    const eventName = mod?.event ?? file.replace(/\.js$/, '');

    if (mod?.event && typeof mod.event !== 'string') {
      console.log(`[${label}] Invalid 'event' export: ${modulePath}`);
      continue;
    }

    if (!eventName || typeof eventName !== 'string') {
      console.log(`[${label}] Missing event name: ${modulePath}`);
      continue;
    }

    if (typeof mod?.run !== 'function') {
      console.log(`[${label}] Invalid module (missing run): ${modulePath}`);
      continue;
    }

    const handler = mod.run.bind(null, client);
    client.on(eventName, handler);
    loaded += 1;

    // Handlers may attach after login — run ready immediately if already online
    if (
      (eventName === 'ready' || eventName === 'clientReady') &&
      typeof client.isReady === 'function' &&
      client.isReady()
    ) {
      Promise.resolve()
        .then(() => handler())
        .catch((err) =>
          console.error(`[${label}] Late ready handler error:`, err?.message || err),
        );
    }
  }

  return loaded;
}

module.exports = { loadEvents };
