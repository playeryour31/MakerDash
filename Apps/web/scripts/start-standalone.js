/**
 * Production web entry for Volyx / Docker-style hosts.
 * Uses Next standalone (required when next.config has output: 'standalone').
 * Always binds IPv4 0.0.0.0 — container HOSTNAME often resolves to IPv6-only
 * and breaks Volyx/Pterodactyl reverse-proxy + public IPv4 access.
 *
 * Port priority: WEB_PORT → SERVER_PORT → 4084
 * (4084 is this project's canonical web port; API defaults to 3011.)
 */
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const candidates = [
  path.join(root, '.next', 'standalone', 'server.js'),
  path.join(root, '.next', 'standalone', 'Apps', 'web', 'server.js'),
];
const server = candidates.find((f) => fs.existsSync(f));
if (!server) {
  console.error(
    'Standalone server not found. Run: npm run build --workspace=@maker/web',
  );
  process.exit(1);
}

const port = String(
  process.env.WEB_PORT || process.env.SERVER_PORT || '4084',
);
process.env.PORT = port;
// Force IPv4 all-interfaces bind (do NOT use container HOSTNAME).
process.env.HOSTNAME = '0.0.0.0';

console.log(`web → http://0.0.0.0:${port} (${path.relative(root, server)})`);
require(server);
