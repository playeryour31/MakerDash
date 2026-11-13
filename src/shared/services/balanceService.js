/**
 * Balance helpers — PostgreSQL only (Mongo removed).
 * DB columns are BIGINT; API surface stays Number for Discord handlers.
 */
const { prisma } = require('@maker/database');

/** Discord slash integers + JS safe arithmetic */
const MAX_BALANCE = Number.MAX_SAFE_INTEGER; // 9_007_199_254_740_991
const MIN_BALANCE = 0;

function toNum(value) {
  if (value == null) return 0;
  if (typeof value === 'bigint') {
    if (value > BigInt(MAX_BALANCE)) return MAX_BALANCE;
    if (value < BigInt(Number.MIN_SAFE_INTEGER)) return Number.MIN_SAFE_INTEGER;
    return Number(value);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clampBalance(value) {
  const n = Math.trunc(toNum(value));
  if (n > MAX_BALANCE) return MAX_BALANCE;
  if (n < MIN_BALANCE) return MIN_BALANCE;
  return n;
}

function toBalanceDoc(row) {
  return {
    userid: row.userId,
    guild: row.guildId,
    coins: toNum(row.coins),
    balance: toNum(row.balance),
    purchaseDate: row.purchaseDate,
    async save() {
      const balance = clampBalance(this.balance);
      const coins = clampBalance(this.coins ?? this.balance);
      this.balance = balance;
      this.coins = coins;
      await prisma.botBalance.update({
        where: {
          userId_guildId: { userId: this.userid, guildId: this.guild },
        },
        data: { coins: BigInt(coins), balance: BigInt(balance) },
      });
      return this;
    },
  };
}

async function getUserBalance(userid, guild) {
  try {
    const row = await prisma.botBalance.findUnique({
      where: {
        userId_guildId: { userId: String(userid), guildId: String(guild) },
      },
    });
    return toNum(row?.balance);
  } catch (err) {
    console.warn(`[balance] get failed: ${err.message}`);
    return 0;
  }
}

async function findGuildBalances(guild, { sortByBalance = true } = {}) {
  const rows = await prisma.botBalance.findMany({
    where: { guildId: String(guild) },
    orderBy: sortByBalance ? { balance: 'desc' } : undefined,
  });
  return rows.map((r) => toBalanceDoc(r));
}

async function addBalance(userid, guild, amount) {
  const userId = String(userid);
  const guildId = String(guild);
  const delta = Math.trunc(toNum(amount));
  const row = await prisma.botBalance.upsert({
    where: { userId_guildId: { userId, guildId } },
    create: {
      userId,
      guildId,
      coins: BigInt(clampBalance(delta)),
      balance: BigInt(clampBalance(delta)),
      purchaseDate: new Date(),
    },
    update: {
      coins: { increment: BigInt(delta) },
      balance: { increment: BigInt(delta) },
    },
  });
  return toBalanceDoc(row);
}

async function findOneBalance(userid, guild) {
  const userId = String(userid);
  const guildId = String(guild);
  const row = await prisma.botBalance.findUnique({
    where: { userId_guildId: { userId, guildId } },
  });
  return row ? toBalanceDoc(row) : null;
}

/** Create zero-balance row if missing (mongoose findOne + new doc pattern). */
async function ensureBalance(userid, guild) {
  const existing = await findOneBalance(userid, guild);
  if (existing) return existing;
  const row = await prisma.botBalance.upsert({
    where: {
      userId_guildId: {
        userId: String(userid),
        guildId: String(guild),
      },
    },
    create: {
      userId: String(userid),
      guildId: String(guild),
      coins: BigInt(0),
      balance: BigInt(0),
      purchaseDate: new Date(),
    },
    update: {},
  });
  return toBalanceDoc(row);
}

/**
 * Drop-in mongoose-like model used by Main handlers:
 *   const Balance = require('.../balanceService').BalanceModel
 *   await Balance.findOne({ userid, guild })
 *   await Balance.updateOne({ userid, guild }, { balance }, { upsert: true })
 */
const BalanceModel = {
  async findOne({ userid, guild }) {
    return findOneBalance(userid, guild);
  },
  async updateOne(filter, update, options = {}) {
    const userId = String(filter.userid);
    const guildId = String(filter.guild);
    const data = update?.$set ? { ...update.$set } : { ...update };
    const balance =
      data.balance != null ? clampBalance(data.balance) : undefined;
    const coins =
      data.coins != null
        ? clampBalance(data.coins)
        : balance != null
          ? balance
          : undefined;

    const payload = {};
    if (balance != null) payload.balance = BigInt(balance);
    if (coins != null) payload.coins = BigInt(coins);

    if (Object.keys(payload).length === 0) {
      return { acknowledged: true, modifiedCount: 0 };
    }

    if (options.upsert) {
      await prisma.botBalance.upsert({
        where: { userId_guildId: { userId, guildId } },
        create: {
          userId,
          guildId,
          balance: BigInt(balance ?? 0),
          coins: BigInt(coins ?? balance ?? 0),
          purchaseDate: new Date(),
        },
        update: payload,
      });
      return { acknowledged: true };
    }

    const result = await prisma.botBalance.updateMany({
      where: { userId, guildId },
      data: payload,
    });
    return { acknowledged: true, modifiedCount: result.count };
  },
  find({ guild }) {
    const promise = findGuildBalances(guild, { sortByBalance: false });
    return {
      sort() {
        return findGuildBalances(guild, { sortByBalance: true });
      },
      then(resolve, reject) {
        return promise.then(resolve, reject);
      },
    };
  },
};

module.exports = {
  getUserBalance,
  findGuildBalances,
  addBalance,
  findOneBalance,
  ensureBalance,
  clampBalance,
  MAX_BALANCE,
  BalanceModel,
};
