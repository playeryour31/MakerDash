/**
 * Quran control-plane store — ALWAYS reads/writes Quran.json on disk.
 *
 * Why: with DATA_READ_SOURCE=postgres the bot's featureCache stays stale
 * after Nest writes actions to Postgres+JSON. Dashboard control must not
 * depend on the in-memory PG cache.
 */
const fs = require('fs');
const path = require('path');

const QURAN_FILE = path.resolve(
  process.cwd(),
  'Maker',
  'Json-Database',
  'Settings',
  'Quran.json',
);

function ensureDir() {
  const dir = path.dirname(QURAN_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readMap() {
  try {
    if (!fs.existsSync(QURAN_FILE)) return {};
    const raw = JSON.parse(fs.readFileSync(QURAN_FILE, 'utf8') || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  ensureDir();
  const tmp = `${QURAN_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(map, null, 4), 'utf8');
  try {
    fs.renameSync(tmp, QURAN_FILE);
  } catch {
    fs.writeFileSync(QURAN_FILE, JSON.stringify(map, null, 4), 'utf8');
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function get(key) {
  const map = readMap();
  return map[String(key)];
}

function set(key, value) {
  const map = readMap();
  map[String(key)] = value;
  writeMap(map);

  // Best-effort: keep featureCache warm so other PG readers see updates
  try {
    const featureCache = require('../../../src/shared/services/featureCache');
    if (featureCache.isHydrated?.()) {
      featureCache.createFeatureDb('quran').set(String(key), value);
    }
  } catch {
    /* optional */
  }

  return value;
}

function getQueue(botId) {
  const raw = get(`Dashboard_Quran_Action_${botId}`);
  return Array.isArray(raw) ? raw : [];
}

function setQueue(botId, queue) {
  return set(`Dashboard_Quran_Action_${botId}`, Array.isArray(queue) ? queue : []);
}

function filePath() {
  return QURAN_FILE;
}

module.exports = {
  QURAN_FILE,
  filePath,
  readMap,
  writeMap,
  get,
  set,
  getQueue,
  setQueue,
};
