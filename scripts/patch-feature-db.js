/**
 * Replace st.db Settings/Systems Database(...) with featureDb(namespace).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const REPLACEMENTS = [
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/Ticket\.json["']\s*\)/g,
    `require("./lib/featureDb")("ticket")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/ticket\.json["']\s*\)/g,
    `require("./lib/featureDb")("ticket")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/TempTicket\.json["']\s*\)/g,
    `require("./lib/featureDb")("temp_ticket")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/Protection\.json["']\s*\)/g,
    `require("./lib/featureDb")("protection")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/Giveaway\.json["']\s*\)/g,
    `require("./lib/featureDb")("giveaway")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/Autoline\.json["']\s*\)/g,
    `require("./lib/featureDb")("autoline")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/Azkar\.json["']\s*\)/g,
    `require("./lib/featureDb")("azkar")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/Feedback\.json["']\s*\)/g,
    `require("./lib/featureDb")("feedback")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/Tax\.json["']\s*\)/g,
    `require("./lib/featureDb")("tax")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/Suggestion\.json["']\s*\)/g,
    `require("./lib/featureDb")("suggestion")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/TempRole\.json["']\s*\)/g,
    `require("./lib/featureDb")("temp_role")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/TempVoice\.json["']\s*\)/g,
    `require("./lib/featureDb")("temp_voice")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/TempChannels\.json["']\s*\)/g,
    `require("./lib/featureDb")("temp_channels")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/Selfrole\.json["']\s*\)/g,
    `require("./lib/featureDb")("selfrole")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/Offer\.json["']\s*\)/g,
    `require("./lib/featureDb")("offer")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/broadcast\.json["']\s*\)/g,
    `require("./lib/featureDb")("broadcast")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/shopDB\.json["']\s*\)/g,
    `require("./lib/featureDb")("shop")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Settings\/stockDB\.json["']\s*\)/g,
    `require("./lib/featureDb")("stock_db")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Systems\/Log\.json["']\s*\)/g,
    `require("./lib/featureDb")("sys_log")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Systems\/Stock\.json["']\s*\)/g,
    `require("./lib/featureDb")("sys_stock")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Systems\/UserData\.json["']\s*\)/g,
    `require("./lib/featureDb")("sys_userdata")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Systems\/VoiceTemp\.json["']\s*\)/g,
    `require("./lib/featureDb")("sys_voicetemp")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Systems\/Reply\.json["']\s*\)/g,
    `require("./lib/featureDb")("sys_reply")`,
  ],
  [
    /new Database\(\s*["']\.\/Maker\/Json-Database\/Systems\/Selfrole\.json["']\s*\)/g,
    `require("./lib/featureDb")("sys_selfrole")`,
  ],
];

// Relative require fix: files under Maker/subdirs need ../lib or ../../lib
function adjustRequire(fileRel, src) {
  const depth = fileRel.split(/[/\\]/).length - 1; // Maker/x.js -> 1, Maker/a/b.js -> 2
  // From Maker/index.js depth=1 -> ./lib
  // From Maker/Events/ready.js depth=2 -> ../lib
  // From Maker/Buttons/X/y.js depth=3 -> ../../lib
  let prefix = './lib/featureDb';
  if (depth === 2) prefix = '../lib/featureDb';
  if (depth >= 3) prefix = '../'.repeat(depth - 1) + 'lib/featureDb';
  return src.replace(/require\(["']\.\/lib\/featureDb["']\)/g, `require("${prefix}")`);
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'lib') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.js')) out.push(p);
  }
  return out;
}

let changed = 0;
for (const file of walk(path.join(ROOT, 'Maker'))) {
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  for (const [re, rep] of REPLACEMENTS) {
    src = src.replace(re, rep);
  }
  if (src === before) continue;
  const rel = path.relative(path.join(ROOT, 'Maker'), file).replace(/\\/g, '/');
  // fix require path based on file location
  const depth = rel.split('/').length;
  let req = './lib/featureDb';
  if (depth === 1) req = './lib/featureDb';
  else req = '../'.repeat(depth - 1) + 'lib/featureDb';
  src = src.replace(/require\(["']\.\/lib\/featureDb["']\)/g, `require("${req}")`);
  fs.writeFileSync(file, src);
  changed += 1;
  console.log('patched', rel);
}
console.log('files changed', changed);
