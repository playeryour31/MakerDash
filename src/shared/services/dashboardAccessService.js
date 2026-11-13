const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(
  process.cwd(),
  'Database',
  'Dashboard',
  'Access.json',
);

function publicBaseUrl() {
  return (
    process.env.DASHBOARD_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function makeSlug() {
  return crypto.randomBytes(18).toString('base64url');
}

function ensureFile() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(
      FILE,
      JSON.stringify({ bySlug: {}, byClientId: {} }, null, 2),
      'utf8',
    );
  }
}

/** Always read fresh from disk to avoid st.db multi-process cache races. */
function readIndex() {
  ensureFile();
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return {
      bySlug: raw.bySlug && typeof raw.bySlug === 'object' ? raw.bySlug : {},
      byClientId:
        raw.byClientId && typeof raw.byClientId === 'object'
          ? raw.byClientId
          : {},
    };
  } catch {
    return { bySlug: {}, byClientId: {} };
  }
}

function writeIndex(index) {
  ensureFile();
  const payload = {
    bySlug: index.bySlug || {},
    byClientId: index.byClientId || {},
  };
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, FILE);
}

function decorate(record) {
  if (!record?.slug) return null;
  return {
    ...record,
    dashboardUrl: `${publicBaseUrl()}/b/${record.slug}`,
    inviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${record.clientId}&permissions=8&scope=bot%20applications.commands`,
  };
}

/** Mirror access into Nest/Postgres (source of truth for dashboard auth). */
function syncAccessToApiBackground(record) {
  if (!record?.clientId || !record?.slug) return;
  const useApi =
    String(process.env.USE_BOT_DATA_API || '').toLowerCase() === 'true' ||
    String(process.env.DATA_WRITE_MODE || '').toLowerCase() === 'postgres' ||
    String(process.env.DATA_WRITE_MODE || '').toLowerCase() === 'dual';
  if (!useApi && String(process.env.DATA_READ_SOURCE || '') !== 'postgres') {
    return;
  }

  const base = (
    process.env.INTERNAL_API_URL ||
    process.env.API_URL ||
    'http://127.0.0.1:4000/api'
  ).replace(/\/$/, '');
  const key =
    process.env.BOT_INTERNAL_API_KEY || process.env.PROVISION_API_KEY || '';

  void (async () => {
    try {
      const fetch = (...args) =>
        import('node-fetch').then(({ default: f }) => f(...args));
      const res = await fetch(`${base}/internal/dashboard-access/ensure`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-bot-internal-key': key,
        },
        body: JSON.stringify({
          clientId: record.clientId,
          type: record.type,
          ownerId: record.ownerId,
          purchasesId: record.purchasesId,
          guildId: record.guildId,
          preferredSlug: record.slug,
        }),
        timeout: 15000,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn(
          `[dashboardAccess] PG sync failed ${res.status}: ${text}`,
        );
      }
    } catch (err) {
      console.warn(
        `[dashboardAccess] PG sync error: ${err?.message || err}`,
      );
    }
  })();
}

/**
 * Ensure a private dashboard access link exists for a purchased bot.
 */
function ensureBotAccess({
  clientId,
  type = 'Apply',
  ownerId,
  purchasesId = null,
  guildId = null,
  preferredSlug = null,
}) {
  if (!clientId) throw new Error('clientId is required');

  const index = readIndex();
  const id = String(clientId);
  let slug = index.byClientId[id] || preferredSlug || null;

  // Repair / update: mapping exists
  if (slug && index.bySlug[slug]) {
    const record = index.bySlug[slug];
    let dirty = false;
    if (ownerId && String(record.ownerId || '') !== String(ownerId)) {
      record.ownerId = String(ownerId);
      dirty = true;
    }
    if (type && String(record.type || '') !== String(type)) {
      record.type = String(type);
      dirty = true;
    }
    if (guildId && String(record.guildId || '') !== String(guildId)) {
      record.guildId = String(guildId);
      dirty = true;
    }
    if (
      purchasesId != null &&
      String(record.purchasesId ?? '') !== String(purchasesId)
    ) {
      record.purchasesId = purchasesId;
      dirty = true;
    }
    if (dirty) {
      index.bySlug[slug] = record;
      writeIndex(index);
    }
    const decorated = decorate(record);
    syncAccessToApiBackground(decorated);
    return decorated;
  }

  if (!slug) slug = makeSlug();

  const record = {
    slug,
    clientId: id,
    type: String(type || 'Apply'),
    ownerId: ownerId ? String(ownerId) : null,
    guildId: guildId ? String(guildId) : null,
    purchasesId: purchasesId ?? null,
    createdAt: new Date().toISOString(),
  };

  index.bySlug[slug] = record;
  index.byClientId[id] = slug;
  writeIndex(index);
  const decorated = decorate(record);
  syncAccessToApiBackground(decorated);
  return decorated;
}

function getBySlug(slug) {
  if (!slug) return null;
  const index = readIndex();
  return decorate(index.bySlug[String(slug)] || null);
}

function getByClientId(clientId) {
  if (!clientId) return null;
  const index = readIndex();
  const slug = index.byClientId[String(clientId)];
  if (!slug) return null;
  return getBySlug(slug);
}

function listAccess() {
  const index = readIndex();
  return Object.values(index.bySlug || {})
    .map((record) => decorate(record))
    .filter(Boolean);
}

module.exports = {
  ensureBotAccess,
  getBySlug,
  getByClientId,
  listAccess,
  publicBaseUrl,
  readIndex,
  writeIndex,
  syncAccessToApiBackground,
};
