/**
 * User blacklist — PostgreSQL (replaces Schema/Blacklist mongoose).
 */
const { prisma } = require('@maker/database');

async function findByUserId(userId) {
  const row = await prisma.userBlacklist.findUnique({
    where: { userId: String(userId) },
  });
  if (!row) return null;
  return {
    UserID: row.userId,
    Reason: row.reason,
    Admin: row.adminId,
    Duration: row.expiresAt,
    createdAt: row.createdAt,
  };
}

async function upsert({ userId, reason, adminId, expiresAt }) {
  return prisma.userBlacklist.upsert({
    where: { userId: String(userId) },
    create: {
      userId: String(userId),
      reason: String(reason || ''),
      adminId: String(adminId || ''),
      expiresAt: expiresAt || null,
    },
    update: {
      reason: String(reason || ''),
      adminId: String(adminId || ''),
      expiresAt: expiresAt || null,
    },
  });
}

async function remove(userId) {
  await prisma.userBlacklist.deleteMany({ where: { userId: String(userId) } });
}

async function listAll() {
  return prisma.userBlacklist.findMany({ orderBy: { createdAt: 'desc' } });
}

async function purgeExpired(client) {
  const now = new Date();
  const expired = await prisma.userBlacklist.findMany({
    where: { expiresAt: { lte: now } },
  });
  for (const entry of expired) {
    await prisma.userBlacklist.delete({ where: { id: entry.id } });
    if (client?.channels) {
      try {
        const channelId = process.env.BLACKLIST_EXPIRE_CHANNEL_ID;
        if (!channelId) continue;
        const ch = await client.channels.fetch(channelId);
        if (ch) {
          await ch.send({
            content: `Blacklist expired for <@${entry.userId}> (${entry.reason})`,
          });
        }
      } catch {
        /* ignore */
      }
    }
  }
  return expired.length;
}

/** mongoose-compatible export used by Main: const { Blacklist } = require(...) */
const Blacklist = {
  findOne: async ({ UserID }) => findByUserId(UserID),
  deleteOne: async ({ UserID }) => remove(UserID),
  find: async (q = {}) => {
    if (q.Duration?.$lte) {
      return prisma.userBlacklist.findMany({
        where: { expiresAt: { lte: q.Duration.$lte } },
      });
    }
    return listAll();
  },
};

function startExpiryLoop(client) {
  setInterval(() => {
    void purgeExpired(client).catch((err) =>
      console.warn(`[blacklist] expire loop: ${err.message}`),
    );
  }, 60_000);
}

module.exports = {
  findByUserId,
  upsert,
  remove,
  listAll,
  purgeExpired,
  Blacklist,
  startExpiryLoop,
};
