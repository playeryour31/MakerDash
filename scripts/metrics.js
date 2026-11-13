#!/usr/bin/env node
/**
 * Codebase metrics — the progress yardstick for the structural cleanup plan.
 *
 * Read-only. Prints a stable, diffable report so each phase can be measured
 * against the previous one instead of argued about.
 *
 * Usage:
 *   node scripts/metrics.js            # human report
 *   node scripts/metrics.js --json     # machine-readable
 *   node scripts/metrics.js --baseline # compare against metrics.baseline.json
 *   node scripts/metrics.js --write-baseline
 *
 * Exit code is always 0 except on baseline regression in --baseline mode.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_FILE = path.join(__dirname, 'metrics.baseline.json');

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.git',
  'backups',
  'archive',
  '.turbo',
]);

/** Areas measured separately: legacy Discord bots vs the modern stack. */
const AREAS = [
  { name: 'Main', dir: 'Main' },
  { name: 'Maker', dir: 'Maker' },
  { name: 'src', dir: 'src' },
  { name: 'Apps/api', dir: 'Apps/api/src' },
  { name: 'Apps/web', dir: 'Apps/web' },
  { name: 'packages', dir: 'packages' },
  { name: 'scripts', dir: 'scripts' },
];

const CODE_EXT = new Set(['.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs']);
const COUNTED_EXT = new Set([...CODE_EXT]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name.toLowerCase())) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function countLines(text) {
  if (!text) return 0;
  let n = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/**
 * Count regex hits without building a second copy of the file in memory.
 */
function countMatches(text, re) {
  const global = re.global ? re : new RegExp(re.source, re.flags + 'g');
  global.lastIndex = 0;
  let n = 0;
  while (global.exec(text)) {
    n++;
    if (global.lastIndex === 0) break; // guard against zero-width loops
  }
  return n;
}

function collectArea(area) {
  const files = walk(path.join(ROOT, area.dir)).filter((f) =>
    COUNTED_EXT.has(path.extname(f).toLowerCase()),
  );
  let lines = 0;
  const big = [];
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const n = countLines(text);
    lines += n;
    if (n > 500) big.push({ file: rel(file), lines: n });
  }
  big.sort((a, b) => b.lines - a.lines);
  return { name: area.name, dir: area.dir, files: files.length, lines, bigFiles: big };
}

/** Legacy coupling markers: the things the plan is meant to remove. */
function collectCoupling() {
  const roots = ['Main', 'Maker', 'src', 'Apps/api/src', 'packages']
    .map((d) => path.join(ROOT, d))
    .filter((d) => fs.existsSync(d));

  const files = [];
  for (const root of roots) walk(root, files);

  const codeFiles = files.filter((f) => CODE_EXT.has(path.extname(f).toLowerCase()));

  const stats = {
    dbConstructorCalls: 0,
    dbConstructorDistinct: 0,
    setIntervalCalls: 0,
    consoleCalls: 0,
    requireFromHere: 0,
    createRequire: 0,
    directFsInApi: 0,
    todoFixme: 0,
    longestFiles: [],
  };

  const dbExpressions = new Map();
  const fileSizes = [];

  for (const file of codeFiles) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const relPath = rel(file);
    const isApi = relPath.startsWith('Apps/api/src/');

    const dbCalls = countMatches(text, /new\s+Database\s*\(/);
    stats.dbConstructorCalls += dbCalls;
    if (dbCalls) {
      const re = /new\s+Database\s*\(\s*([^)\n]*)/g;
      let m;
      while ((m = re.exec(text))) {
        const key = m[1]
          .replace(/\\/g, '/')
          .replace(/['"]/g, '')
          .replace(/\$\{[^}]*\}/g, '${}')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80);
        dbExpressions.set(key, (dbExpressions.get(key) || 0) + 1);
      }
    }

    stats.setIntervalCalls += countMatches(text, /\bsetInterval\s*\(/);
    stats.consoleCalls += countMatches(text, /\bconsole\s*\.\s*\w+\s*\(/);
    stats.requireFromHere += countMatches(text, /\brequireFromHere\s*\(/);
    stats.createRequire += countMatches(text, /\bcreateRequire\s*\(/);
    stats.todoFixme += countMatches(text, /\b(TODO|FIXME|HACK|XXX)\b/);

    if (isApi) {
      // Direct disk access inside the API is what phase 3 removes.
      stats.directFsInApi +=
        countMatches(text, /\b(readFileSync|writeFileSync|appendFileSync)\s*\(/) +
        countMatches(text, /['"]fs['"]/);
    }

    fileSizes.push({ file: relPath, lines: countLines(text) });
  }

  stats.dbConstructorDistinct = dbExpressions.size;
  stats.topDbExpressions = [...dbExpressions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([expression, count]) => ({ expression, count }));

  stats.longestFiles = fileSizes.sort((a, b) => b.lines - a.lines).slice(0, 10);

  return stats;
}

/** Legacy JSON store footprint — expected to shrink to zero. */
function collectJsonStores() {
  const targets = [
    { name: 'Database', dir: 'Database' },
    { name: 'Maker/Json-Database', dir: 'Maker/Json-Database' },
    { name: 'Subscriptions/Database', dir: 'Subscriptions/Database' },
  ];
  return targets
    .filter((t) => fs.existsSync(path.join(ROOT, t.dir)))
    .map((t) => {
      const files = walk(path.join(ROOT, t.dir)).filter((f) => f.toLowerCase().endsWith('.json'));
      let bytes = 0;
      for (const f of files) {
        try {
          bytes += fs.statSync(f).size;
        } catch {
          /* ignore */
        }
      }
      return {
        name: t.name,
        files: files.length,
        megabytes: Math.round((bytes / 1024 / 1024) * 100) / 100,
      };
    });
}

function collectTimers() {
  const roots = ['Main', 'Maker', 'src', 'Apps/api/src']
    .map((d) => path.join(ROOT, d))
    .filter((d) => fs.existsSync(d));
  const files = [];
  for (const root of roots) walk(root, files);

  const byFile = new Map();
  let total = 0;
  for (const file of files) {
    if (!CODE_EXT.has(path.extname(file).toLowerCase())) continue;
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const n = countMatches(text, /\bsetInterval\s*\(/);
    if (n) {
      total += n;
      byFile.set(rel(file), n);
    }
  }
  const worst = [...byFile.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([file, count]) => ({ file, count }));
  return { total, worst };
}

function collect() {
  return {
    generatedAt: new Date().toISOString(),
    areas: AREAS.map(collectArea),
    coupling: collectCoupling(),
    jsonStores: collectJsonStores(),
    timers: collectTimers(),
  };
}

/** The subset that must never regress. */
function comparable(report) {
  return {
    areas: Object.fromEntries(
      report.areas.map((a) => [a.name, { files: a.files, lines: a.lines }]),
    ),
    coupling: {
      dbConstructorCalls: report.coupling.dbConstructorCalls,
      dbConstructorDistinct: report.coupling.dbConstructorDistinct,
      setIntervalCalls: report.coupling.setIntervalCalls,
      consoleCalls: report.coupling.consoleCalls,
      requireFromHere: report.coupling.requireFromHere,
      createRequire: report.coupling.createRequire,
      directFsInApi: report.coupling.directFsInApi,
    },
    timers: { total: report.timers.total },
    jsonStores: report.jsonStores,
  };
}

function printHuman(report) {
  const { areas, coupling, jsonStores, timers } = report;

  console.log('MakerDash metrics');
  console.log('=================');

  console.log('\nCode size');
  console.log(['area'.padEnd(12), 'files'.padStart(7), 'lines'.padStart(9)].join(''));
  for (const a of areas) {
    console.log(
      [a.name.padEnd(12), String(a.files).padStart(7), String(a.lines).padStart(9)].join(''),
    );
  }

  console.log('\nLegacy coupling');
  const rows = [
    ['new Database() calls', coupling.dbConstructorCalls],
    ['distinct DB paths', coupling.dbConstructorDistinct],
    ['setInterval calls', coupling.setIntervalCalls],
    ['console.* calls', coupling.consoleCalls],
    ['createRequire()', coupling.createRequire],
    ['requireFromHere()', coupling.requireFromHere],
    ['direct fs in API', coupling.directFsInApi],
    ['TODO/FIXME', coupling.todoFixme],
  ];
  for (const [label, value] of rows) {
    console.log(['  ', label.padEnd(24), String(value).padStart(6)].join(''));
  }

  console.log('\nTimers by file (top)');
  for (const t of timers.worst) {
    console.log(['  ', String(t.count).padStart(3), ' ', t.file].join(''));
  }

  console.log('\nLegacy JSON stores');
  if (!jsonStores.length) console.log('  (none)');
  for (const s of jsonStores) {
    console.log(
      [
        '  ',
        s.name.padEnd(24),
        String(s.files).padStart(5),
        ' files ',
        String(s.megabytes).padStart(8),
        ' MB',
      ].join(''),
    );
  }

  console.log('\nTop DB path expressions');
  for (const e of coupling.topDbExpressions) {
    console.log(['  ', String(e.count).padStart(4), ' ', e.expression].join(''));
  }

  console.log('\nLongest files');
  for (const f of coupling.longestFiles) {
    console.log(['  ', String(f.lines).padStart(6), ' ', f.file].join(''));
  }
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function compareToBaseline(report, baseline) {
  const now = comparable(report);
  const before = baseline;
  const regressions = [];
  const improvements = [];

  for (const [area, values] of Object.entries(now.areas)) {
    const old = before.areas?.[area];
    if (!old) continue;
    for (const key of ['files', 'lines']) {
      const delta = values[key] - old[key];
      if (delta > 0) regressions.push(`${area}.${key} +${delta}`);
      else if (delta < 0) improvements.push(`${area}.${key} ${delta}`);
    }
  }

  for (const [key, value] of Object.entries(now.coupling)) {
    const old = before.coupling?.[key];
    if (typeof old !== 'number') continue;
    const delta = value - old;
    if (delta > 0) regressions.push(`coupling.${key} +${delta}`);
    else if (delta < 0) improvements.push(`coupling.${key} ${delta}`);
  }

  const timerDelta = now.timers.total - (before.timers?.total ?? now.timers.total);
  if (timerDelta > 0) regressions.push(`timers.total +${timerDelta}`);
  else if (timerDelta < 0) improvements.push(`timers.total ${timerDelta}`);

  return { regressions, improvements };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const report = collect();

  if (args.has('--write-baseline')) {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(comparable(report), null, 2) + '\n', 'utf8');
    console.log(`baseline written: ${rel(BASELINE_FILE)}`);
    return 0;
  }

  if (args.has('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }

  printHuman(report);

  if (args.has('--baseline')) {
    const baseline = readBaseline();
    if (!baseline) {
      console.log('\nNo baseline yet. Run: node scripts/metrics.js --write-baseline');
      return 0;
    }
    const { regressions, improvements } = compareToBaseline(report, baseline);
    console.log('\nAgainst baseline');
    if (!regressions.length && !improvements.length) console.log('  no change');
    for (const r of improvements) console.log(`  better  ${r}`);
    for (const r of regressions) console.log(`  WORSE   ${r}`);
    if (regressions.length) return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { collect, comparable };
