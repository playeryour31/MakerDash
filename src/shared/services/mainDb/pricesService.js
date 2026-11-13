const { prisma } = require('@maker/database');
const platformCache = require('../platformCache');

function mirror() {
  return platformCache.createPlatformDb('guild_bot_prices_mirror');
}

function priceKeyFromFlat(flatKey) {
  const m = String(flatKey).match(/^(.*)_(\d{16,20})$/);
  if (!m) return null;
  return { priceKey: m[1], guildId: m[2] };
}

function flatKey(priceKey, guildId) {
  return `${priceKey}_${guildId}`;
}

async function get(flatOrGuild, maybePriceKey) {
  if (maybePriceKey != null) {
    const row = await prisma.guildBotPrice.findUnique({
      where: {
        guildId_priceKey: {
          guildId: String(flatOrGuild),
          priceKey: String(maybePriceKey),
        },
      },
    });
    return row?.price;
  }
  return getSync(flatOrGuild);
}

function getSync(flatKeyStr) {
  return mirror().get(String(flatKeyStr));
}

async function set(flatOrGuild, valueOrPriceKey, maybeValue) {
  let guildId;
  let priceKey;
  let price;
  if (maybeValue !== undefined) {
    guildId = String(flatOrGuild);
    priceKey = String(valueOrPriceKey);
    price = Number(maybeValue) || 0;
  } else {
    const parsed = priceKeyFromFlat(flatOrGuild);
    if (!parsed) {
      mirror().set(String(flatOrGuild), valueOrPriceKey);
      return valueOrPriceKey;
    }
    guildId = parsed.guildId;
    priceKey = parsed.priceKey;
    price = Number(valueOrPriceKey) || 0;
  }
  mirror().set(flatKey(priceKey, guildId), price);
  await prisma.guildBotPrice.upsert({
    where: { guildId_priceKey: { guildId, priceKey } },
    create: { guildId, priceKey, price },
    update: { price },
  });
  return price;
}

function setSync(flatKeyStr, value) {
  mirror().set(String(flatKeyStr), value);
  void set(flatKeyStr, value);
  return value;
}

function allSync() {
  return mirror().all() || [];
}

module.exports = {
  get,
  getSync,
  set,
  setSync,
  allSync,
  priceKeyFromFlat,
  flatKey,
};
