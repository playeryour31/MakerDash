const { prisma } = require('@maker/database');
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
  const tokens = rows.map((r) => r.token);
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
  const next = listSync(k).filter((t) => t !== row.token);
  mirror(k).set('Tokens', next);
  return row.token;
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
    .deleteMany({ where: { kind: k, token } })
    .catch(() => {});
  return token;
}

async function add(kind, token) {
  const k = KIND_MAP[kind] || kind;
  const t = String(token);
  await prisma.tokenPoolEntry.upsert({
    where: { kind_token: { kind: k, token: t } },
    create: { kind: k, token: t },
    update: {},
  });
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
  await prisma.tokenPoolEntry.deleteMany({ where: { kind: k, token: t } });
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
        .create({ data: { kind: k, token } })
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
