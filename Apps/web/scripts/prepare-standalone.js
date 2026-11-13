const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appRoot = path.join(__dirname, '..');
const standalone = path.join(appRoot, '.next', 'standalone');
const targetNodeModules = path.join(standalone, 'node_modules');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function pkgVersion(name) {
  const candidates = [
    path.join(appRoot, 'node_modules', name, 'package.json'),
    path.join(appRoot, '../../node_modules', name, 'package.json'),
    path.join(standalone, 'node_modules', name, 'package.json'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')).version;
  }
  throw new Error(`Cannot resolve installed version for ${name}`);
}

function findServerJs(dir) {
  const direct = path.join(dir, 'server.js');
  if (fs.existsSync(direct)) return direct;

  const nested = [
    path.join(dir, 'Apps', 'web', 'server.js'),
    path.join(dir, 'apps', 'web', 'server.js'),
  ];
  for (const file of nested) {
    if (fs.existsSync(file)) return file;
  }

  return null;
}

if (!fs.existsSync(standalone)) {
  console.error('Missing .next/standalone — run next build first');
  process.exit(1);
}

const serverJs = findServerJs(standalone);
if (!serverJs) {
  console.error('Missing standalone server.js (checked .next/standalone and Apps/web)');
  process.exit(1);
}

const appDir = path.dirname(serverJs);
console.log(`Standalone server: ${path.relative(appRoot, serverJs)}`);

copyDir(path.join(appRoot, '.next', 'static'), path.join(appDir, '.next', 'static'));
copyDir(path.join(appRoot, 'public'), path.join(appDir, 'public'));

if (path.resolve(appDir) !== path.resolve(standalone)) {
  console.log('Flattening nested monorepo standalone output for Compute');
  for (const entry of fs.readdirSync(appDir, { withFileTypes: true })) {
    const from = path.join(appDir, entry.name);
    const to = path.join(standalone, entry.name);
    if (entry.name === 'node_modules' && fs.existsSync(to)) continue;
    fs.cpSync(from, to, { recursive: true, force: true });
  }
}

const runtimePkg = {
  name: 'web',
  private: true,
  dependencies: {
    next: pkgVersion('next'),
    react: pkgVersion('react'),
    'react-dom': pkgVersion('react-dom'),
    sharp: pkgVersion('sharp'),
  },
};
fs.writeFileSync(path.join(standalone, 'package.json'), `${JSON.stringify(runtimePkg, null, 2)}\n`);

const needsInstall =
  !fs.existsSync(path.join(targetNodeModules, 'react')) ||
  !fs.existsSync(path.join(targetNodeModules, 'react-dom')) ||
  !fs.existsSync(path.join(targetNodeModules, 'next')) ||
  !fs.existsSync(path.join(targetNodeModules, 'sharp'));

if (needsInstall) {
  console.log('Installing pinned Next/React/sharp into .next/standalone ...');
  execSync(
    'npm install --omit=dev --prefer-offline --no-audit --no-fund',
    { cwd: standalone, stdio: 'inherit' },
  );
}

if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  console.error('Flatten failed: .next/standalone/server.js still missing');
  process.exit(1);
}

console.log('Standalone ready');
