const path = require('path');

/**
 * Path helpers for JSON databases.
 * Prefer project-relative paths for st.db (it resolves from process.cwd()).
 * Physical files stay in Database/ and Maker/Json-Database.
 */
const ROOT = path.join(__dirname, '..', '..', '..');

const relative = {
  database: 'Database',
  botJsonDatabase: path.join('Maker', 'Json-Database'),
  tokens: path.join('Database', 'Others', 'Tokens.json'),
  runBots: path.join('Database', 'BotMaker', 'RunBots.json'),
  backups: 'Backups',
};

const absolute = {
  root: ROOT,
  database: path.join(ROOT, 'Database'),
  botJsonDatabase: path.join(ROOT, 'Maker', 'Json-Database'),
  tokens: path.join(ROOT, 'Database', 'Others', 'Tokens.json'),
  runBots: path.join(ROOT, 'Database', 'BotMaker', 'RunBots.json'),
  backups: path.join(ROOT, 'Backups'),
};

/** Relative path segments under Database/ — safe for st.db */
function dbPath(...segments) {
  return path.join(relative.database, ...segments);
}

/** Relative path segments under Maker/Json-Database — safe for st.db */
function botDbPath(...segments) {
  return path.join(relative.botJsonDatabase, ...segments);
}

module.exports = {
  paths: relative,
  absolutePaths: absolute,
  dbPath,
  botDbPath,
};
