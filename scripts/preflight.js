#!/usr/bin/env node
/**
 * Deployment preflight: catches the two failure modes that are cheap to fix
 * and expensive in production.
 *
 *   1. Port drift — nginx upstream vs WEB_PORT vs INTERNAL_API_ORIGIN vs API PORT
 *   2. Token-encryption key drift — missing, too short, or different between
 *      Apps/api/.env and packages/database/.env
 *   3. Session-cookie host drift — the dashboard and the OAuth callback must
 *      share a host, or SESSION_COOKIE_DOMAIN must cover both (cookies ignore
 *      ports but not hostnames)
 *
 * Read-only. Never prints secret values (only a short fingerprint).
 *
 * Usage: npm run preflight
 * Exit code 1 when a blocking mismatch is found.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const DEFAULTS = { apiPort: 3011, webPort: 4084 };
const MIN_KEY_LENGTH = 32;

function read(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function parseEnv(text) {
  const map = new Map();
  if (!text) return map;
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map.set(m[1], value);
  }
  return map;
}

function pick(relPreferred, relFallback) {
  const preferred = read(relPreferred);
  if (preferred !== null) return { file: relPreferred, env: parseEnv(preferred) };
  const fallback = read(relFallback);
  if (fallback !== null) return { file: relFallback, env: parseEnv(fallback) };
  return { file: null, env: new Map() };
}

function portOf(url, label) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.port) return Number(parsed.port);
    if (parsed.protocol === 'https:') return 443;
    if (parsed.protocol === 'http:') return 80;
  } catch {
    /* fallthrough */
  }
  throw new Error(`Cannot parse ${label} as a URL: ${url}`);
}

function hostOf(url, label) {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`Cannot parse ${label} as a URL: ${url}`);
  }
}

function fingerprint(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 8);
}

function main() {
  const api = pick('Apps/api/.env', 'Apps/api/.env.example');
  const db = pick('packages/database/.env', 'packages/database/.env.example');
  const web = pick('Apps/web/.env.local', 'Apps/web/.env.example');
  const nginx = read('deploy/nginx.maker.conf');

  // A fresh clone has no real env files. Falling back to the examples must not
  // fail the check (they intentionally contain placeholders) — downgrade the
  // key checks to warnings unless at least one real env file exists.
  const errors = [];
  const warnings = [];
  const rows = [];

  const isExample = (file) => Boolean(file && file.endsWith('.example'));
  const keysAreExamples = isExample(api.file) && isExample(db.file);
  const keyFindings = keysAreExamples ? warnings : errors;

  // ── ports ────────────────────────────────────────────────────────────────
  const apiPort = Number(api.env.get('PORT')) || DEFAULTS.apiPort;
  const webPort = Number(web.env.get('WEB_PORT')) || DEFAULTS.webPort;
  const internalOrigin = web.env.get('INTERNAL_API_ORIGIN') || '';
  const internalOriginPort = portOf(internalOrigin, 'INTERNAL_API_ORIGIN');
  const internalApiUrl = api.env.get('INTERNAL_API_URL') || '';
  const internalApiPort = portOf(internalApiUrl, 'INTERNAL_API_URL');

  let nginxPort = null;
  if (!nginx) {
    errors.push('deploy/nginx.maker.conf is missing.');
  } else {
    const m = /upstream\s+maker_web\s*\{[^}]*?server\s+[^\s:]+:(\d+)\s*;/s.exec(nginx);
    if (!m)
      errors.push('Could not find `upstream maker_web { server host:PORT; }` in nginx config.');
    else nginxPort = Number(m[1]);
  }

  rows.push(['API listens', `PORT=${apiPort}`, api.file]);
  rows.push(['Web listens', `WEB_PORT=${webPort}`, web.file]);
  rows.push(['Next → API proxy', internalOrigin || '(unset)', web.file]);
  rows.push(['Bot → API', internalApiUrl || '(unset)', api.file]);
  rows.push([
    'nginx → web',
    nginxPort ? `127.0.0.1:${nginxPort}` : '(unset)',
    'deploy/nginx.maker.conf',
  ]);

  // ── session cookie host ──────────────────────────────────────────────────
  // The session lives in a host-scoped HttpOnly cookie. Ports are ignored, so
  // the default same-host setup (Next proxies /api) works. A different API
  // hostname only works when SESSION_COOKIE_DOMAIN covers both hosts.
  const dashboardHost = hostOf(api.env.get('DASHBOARD_PUBLIC_URL'), 'DASHBOARD_PUBLIC_URL');
  const redirectHost = hostOf(api.env.get('DISCORD_REDIRECT_URI'), 'DISCORD_REDIRECT_URI');
  const cookieDomain = (api.env.get('SESSION_COOKIE_DOMAIN') || api.env.get('COOKIE_DOMAIN') || '')
    .trim()
    .replace(/^\./, '');

  let cookieHostState = '(unset)';
  if (dashboardHost && redirectHost) {
    if (dashboardHost === redirectHost) {
      cookieHostState = `same host (${dashboardHost})`;
    } else {
      const covered = (host) =>
        Boolean(cookieDomain) && (host === cookieDomain || host.endsWith(`.${cookieDomain}`));
      if (covered(dashboardHost) && covered(redirectHost)) {
        cookieHostState = `shared via .${cookieDomain}`;
      } else {
        cookieHostState = `MISMATCH ${dashboardHost} ≠ ${redirectHost}`;
        errors.push(
          `SESSION cookie would break: DASHBOARD_PUBLIC_URL host (${dashboardHost}) differs from DISCORD_REDIRECT_URI host (${redirectHost}) and SESSION_COOKIE_DOMAIN does not cover both. Keep them on the same host or set SESSION_COOKIE_DOMAIN=.example.com.`,
        );
      }
    }
  }
  rows.push(['Session cookie host', cookieHostState, 'Apps/api/.env']);

  if (nginxPort !== null && nginxPort !== webPort) {
    errors.push(`nginx upstream ${nginxPort} ≠ WEB_PORT ${webPort}.`);
  }
  if (internalOriginPort !== null && internalOriginPort !== apiPort) {
    errors.push(`INTERNAL_API_ORIGIN ${internalOriginPort} ≠ API PORT ${apiPort}.`);
  }
  if (internalApiPort !== null && internalApiPort !== apiPort) {
    errors.push(`INTERNAL_API_URL ${internalApiPort} ≠ API PORT ${apiPort}.`);
  }

  // ── token-encryption key ─────────────────────────────────────────────────
  const apiKey = (api.env.get('BOT_TOKEN_ENCRYPTION_KEY') || '').trim();
  const dbKey = (db.env.get('BOT_TOKEN_ENCRYPTION_KEY') || '').trim();
  const keySources = `${api.file || 'Apps/api/.env'} + ${db.file || 'packages/database/.env'}`;

  if (!apiKey || !dbKey) {
    keyFindings.push(
      `BOT_TOKEN_ENCRYPTION_KEY missing (${!apiKey ? api.file || 'Apps/api/.env' : ''}${!apiKey && !dbKey ? ' and ' : ''}${!dbKey ? db.file || 'packages/database/.env' : ''}).`,
    );
  } else {
    if (apiKey.length < MIN_KEY_LENGTH || dbKey.length < MIN_KEY_LENGTH) {
      keyFindings.push(
        `BOT_TOKEN_ENCRYPTION_KEY is too short (${Math.min(apiKey.length, dbKey.length)} < ${MIN_KEY_LENGTH} chars).`,
      );
    }
    if (apiKey !== dbKey) {
      keyFindings.push(
        `BOT_TOKEN_ENCRYPTION_KEY differs between env files (sha ${fingerprint(apiKey)} vs ${fingerprint(dbKey)}).`,
      );
    }
    if (/change-me|^dev-/i.test(apiKey)) {
      warnings.push('BOT_TOKEN_ENCRYPTION_KEY still looks like a placeholder.');
    }
  }
  rows.push([
    'Token key',
    apiKey && dbKey
      ? `${apiKey === dbKey ? 'identical' : 'DIFFERENT'} · sha ${fingerprint(apiKey)} · ${apiKey.length} chars`
      : '(missing)',
    keySources,
  ]);

  // ── report ───────────────────────────────────────────────────────────────
  console.log('\n🔧 MakerDash deployment preflight\n');
  for (const [label, value, source] of rows) {
    console.log(`   ${label.padEnd(20)} ${String(value).padEnd(44)} ${source || ''}`);
  }
  console.log('');

  if (keysAreExamples) {
    warnings.push(
      'Using *.env.example only — copy them to Apps/api/.env, packages/database/.env and Apps/web/.env.local before deploying.',
    );
  }
  for (const w of warnings) console.log(`⚠️  ${w}`);
  if (errors.length) {
    for (const e of errors) console.log(`❌ ${e}`);
    console.log(
      '\nFix the values above (or run with the same ports everywhere) and re-run npm run preflight.\n',
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    keysAreExamples
      ? '✅ ports are consistent — env files are examples only.\n'
      : '✅ ports and token-encryption key are consistent.\n',
  );
}

try {
  main();
} catch (err) {
  console.error(`\n❌ preflight failed: ${err.message}\n`);
  process.exitCode = 1;
}
