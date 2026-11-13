/**
 * Production entry for Volyx Smart Startup / panel Start button.
 * Starts API + Web + Discord bots together via turbo.
 *
 * Main File in panel: scripts/run-stack.js
 */
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
process.chdir(root);

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
// Volyx primary allocation — keep web on the public domain port
if (!process.env.WEB_PORT) {
  process.env.WEB_PORT = process.env.SERVER_PORT || '4084';
}

const child = spawn('npm', ['run', 'start'], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code == null ? 1 : code);
});

['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
});
