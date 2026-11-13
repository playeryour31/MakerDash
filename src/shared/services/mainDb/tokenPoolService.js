const {
  prisma,
  encryptPoolToken,
  decryptPoolToken,
  isEncryptedPoolToken,
} = require('@maker/database');
const platformCache = require('../platformCache');

const KIND_MAP = {
  unused: 'unused',
  working: 'working',
  non_working: 'non_working',
  error: 'error',
  expired: 'expired',
  botmaker: 'botmaker',
  expiring: 'expiring',
};

function mirror(kind) {
  return platformCache.createPlatformDb(`token_pool_${kind}`);
}

/** Rows are stored encrypted; mirrors keep plaintext for the legacy handlers. */
function enc(token) {
  return encryptPoolToken(String(token));
}

function dec(stored) {
  return decryptPoolToken(String(stored ?? ''));
}

/**
 * Drop a plaintext row left over from before at-rest encryption.
 * `add`/`remove` call this so pools heal as they are used, without waiting for
 * the one-off migration to be re-run.
 */
function dropLegacyRow(kind, token) {
  const plain = String(token);
  if (isEncryptedPoolToken(plain)) return Promise.resolve();
  return prisma.tokenPoolEntry
    .deleteMany({ where: { kind, token: plain } })
    .catch(() => {});
}

function listSync(kind) {
  const k = KIND_MAP[kind] || kind;
  const tokens = mirror(k).get('Tokens');
  return Array.isArray(tokens) ? tokens : [];
}

async function list(kind) {
  const k = KIND_MAP[kind] || kind;
  const rows = await prisma.tokenPoolEntry.findMany({
    where: { kind: k },
    orderBy: { createdAt: 'asc' },
    select: { token: true },
  });
  const tokens = rows.map((r) => dec(r.token));
  mirror(k).set('Tokens', tokens);
  return tokens;
}

async function take(kind = 'unused') {
  const k = KIND_MAP[kind] || kind;
  const row = await prisma.tokenPoolEntry.findFirst({
    where: { kind: k },
    orderBy: { createdAt: 'asc' },
  });
  if (!row) return null;
  await prisma.tokenPoolEntry.delete({ where: { id: row.id } });
  const token = dec(row.token);
  const next = listSync(k).filter((t) => t !== token);
  mirror(k).set('Tokens', next);
  return token;
}

function takeSync(kind = 'unused') {
  const k = KIND_MAP[kind] || kind;
  const tokens = listSync(k);
  const token = tokens[0] || null;
  if (!token) return null;
  mirror(k).set(
    'Tokens',
    tokens.filter((t) => t !== token),
  );
  void prisma.tokenPoolEntry
    .deleteMany({ where: { kind: k, token: { in: [enc(token), token] } } })
    .catch(() => {});
  return token;
}

async function add(kind, token) {
  const k = KIND_MAP[kind] || kind;
  const t = String(token);
  const stored = enc(t);
  await prisma.tokenPoolEntry.upsert({
    where: { kind_token: { kind: k, token: stored } },
    create: { kind: k, token: stored },
    update: {},
  });
  await dropLegacyRow(k, t);
  const cur = listSync(k);
  if (!cur.includes(t)) cur.push(t);
  mirror(k).set('Tokens', cur);
  return t;
}

function addSync(kind, token) {
  const k = KIND_MAP[kind] || kind;
  const t = String(token);
  const cur = listSync(k);
  if (!cur.includes(t)) cur.push(t);
  mirror(k).set('Tokens', cur);
  void add(k, t);
  return t;
}

async function remove(kind, token) {
  const k = KIND_MAP[kind] || kind;
  const t = String(token);
  await prisma.tokenPoolEntry.deleteMany({
    where: { kind: k, token: enc(t) },
  });
  await dropLegacyRow(k, t);
  mirror(k).set(
    'Tokens',
    listSync(k).filter((x) => x !== t),
  );
}

function removeSync(kind, token) {
  const k = KIND_MAP[kind] || kind;
  const t = String(token);
  mirror(k).set(
    'Tokens',
    listSync(k).filter((x) => x !== t),
  );
  void remove(k, t);
}

function setTokensSync(kind, tokens) {
  const k = KIND_MAP[kind] || kind;
  const list = Array.isArray(tokens) ? tokens.map(String) : [];
  mirror(k).set('Tokens', list);
  void (async () => {
    await prisma.tokenPoolEntry.deleteMany({ where: { kind: k } });
    for (const token of list.slice(0, 2000)) {
      await prisma.tokenPoolEntry
        .create({ data: { kind: k, token: enc(token) } })
        .catch(() => {});
    }
  })();
  return list;
}

module.exports = {
  KIND_MAP,
  list,
  listSync,
  take,
  takeSync,
  add,
  addSync,
  remove,
  removeSync,
  setTokensSync,
};
