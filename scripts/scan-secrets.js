#!/usr/bin/env node
/**
 * Secret scanner for MakerDash.
 *
 * Usage:
 *   node scripts/scan-secrets.js            # scans files git would commit
 *   node scripts/scan-secrets.js --staged   # scans staged files only (pre-commit)
 *   node scripts/scan-secrets.js --all      # scans the whole tree (ignored files too)
 *   node scripts/scan-secrets.js --json     # machine-readable output
 *
 * Exit code 1 when anything that looks like a live credential is found.
 * Built-ins only: safe to run before `npm ci`.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.turbo',
  'Backups',
  'coverage',
  '.secure-local',
  'vault',
]);
const TEXT_EXT = new Set([
  '.js',
  '.cjs',
  '.mjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.json',
  '.md',
  '.txt',
  '.yml',
  '.yaml',
  '.env',
  '.conf',
  '.ini',
  '.sh',
  '.ps1',
  '.prisma',
  '.sql',
]);
const MAX_BYTES = 4 * 1024 * 1024;

const RULES = [
  {
    id: 'discord-token',
    label: 'Discord bot token',
    re: /\b(?:mfa\.[A-Za-z0-9_-]{70,}|[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{25,45})\b/g,
  },
  {
    id: 'mongo-uri',
    label: 'MongoDB URI with credentials',
    re: /mongodb(?:\+srv)?:\/\/[^\s'"`:@/]+:[^\s'"`@]+@[^\s'"`]+/g,
  },
  {
    id: 'discord-webhook',
    label: 'Discord webhook URL',
    re: /https?:\/\/discord(?:app)?\.com\/api\/webhooks\/\d{5,}\/[A-Za-z0-9_-]{20,}/g,
  },
  {
    id: 'private-key',
    label: 'Private key block',
    re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
  {
    id: 'aws-key',
    label: 'AWS access key id',
    re: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    id: 'google-api-key',
    label: 'Google API key',
    re: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    id: 'openai-api-key',
    label: 'OpenAI API key',
    re: /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/g,
  },
  {
    id: 'assigned-secret',
    label: 'Hard-coded secret assignment',
    // "Token": "....", password: '....', api_key = "...."
    re: /["']?(?:token|password|passwd|client[_-]?secret|api[_-]?key|secret)["']?\s*[:=]\s*["']([^"'\s]{16,})["']/gi,
    valueGroup: 1,
    minLength: 20,
    requireDigit: true,
    ignoreValue: /^(?:process\.env|change-me|dev-|your[-_]|example|\$\{|<|\{|%|\*+|x{6,})/i,
    ignoreKeyContext: /tokenEnc|token_enc|hash|mfa|pendingCode/i,
  },
];

function redact(value) {
  const s = String(value);
  if (s.length <= 12) return '*'.repeat(s.length);
  return `${s.slice(0, 4)}…${s.slice(-4)} (len ${s.length})`;
}

function hasGit() {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: ROOT,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function gitFiles(args) {
  const out = execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }) || '';
  return out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!TEXT_EXT.has(ext)) continue;
    acc.push(full);
  }
  return acc;
}

function collectFiles(opts) {
  if (opts.all) {
    return walk(ROOT, []).map((f) => path.relative(ROOT, f));
  }
  if (!hasGit()) {
    return walk(ROOT, []).map((f) => path.relative(ROOT, f));
  }
  if (opts.staged) {
    return gitFiles(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  }
  return gitFiles(['ls-files', '--cached', '--others', '--exclude-standard']);
}

function scanFile(rel) {
  const full = path.join(ROOT, rel);
  const findings = [];
  let text;
  try {
    const stat = fs.statSync(full);
    if (!stat.isFile() || stat.size > MAX_BYTES) return findings;
    text = fs.readFileSync(full, 'utf8');
  } catch {
    return findings;
  }

  const lines = text.split(/\r?\n/);
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line || line.length > 4000) continue;
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        if (rule.ignoreKeyContext && rule.ignoreKeyContext.test(line)) break;
        const value = rule.valueGroup ? m[rule.valueGroup] : m[0];
        if (!value) continue;
        if (rule.minLength && value.length < rule.minLength) continue;
        if (rule.requireDigit && !/\d/.test(value)) continue;
        if (rule.ignoreValue && rule.ignoreValue.test(value)) continue;
        if (rule.ignoreValue && rule.valueGroup && rule.ignoreValue.test(m[0].replace(value, ''))) {
          continue;
        }
        findings.push({
          rule: rule.id,
          label: rule.label,
          file: rel,
          line: i + 1,
          preview: redact(value),
        });
      }
    }
  }
  return findings;
}

function main() {
  const argv = process.argv.slice(2);
  const opts = {
    staged: argv.includes('--staged'),
    all: argv.includes('--all'),
    json: argv.includes('--json'),
  };

  const files = collectFiles(opts);
  const findings = [];
  for (const rel of files) findings.push(...scanFile(rel));

  if (opts.json) {
    process.stdout.write(`${JSON.stringify({ scanned: files.length, findings }, null, 2)}\n`);
    process.exitCode = findings.length ? 1 : 0;
    return;
  }

  const scope = opts.all
    ? 'whole tree (including ignored files)'
    : opts.staged
      ? 'staged files'
      : 'files git would commit';
  console.log(`\n🔎 Secret scan — ${scope}`);
  console.log(`   files scanned: ${files.length}\n`);

  if (!findings.length) {
    console.log('✅ No live credentials detected.\n');
    return;
  }

  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, list] of byFile) {
    console.log(`❌ ${file}`);
    for (const f of list) {
      console.log(`   line ${f.line}: ${f.label} → ${f.preview}`);
    }
  }
  console.log(`\n🚨 ${findings.length} potential secret(s) in ${byFile.size} file(s).`);
  console.log('   Rotate exposed credentials, move them to .env / PostgreSQL, then re-run.\n');
  process.exitCode = 1;
}

main();
