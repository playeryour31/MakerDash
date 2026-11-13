/**
 * Subscription lifecycle: warn → grace (3 days) → purge.
 * Active Tokens list only contains runnable bots; grace snapshots live in Expired store + PG meta.
 *
 * PHASE 1: the *policy* now lives in @maker/subscriptions (pure, dependency-free,
 * unit-tested). This file keeps only the side effects — Discord clients, JSON
 * stores, Prisma writes — and translates the package's vocabulary back to the
 * legacy one, because existing callers compare against 'purge':
 *   Maker/lib/botHealthSupervisor.js:93  phase === 'purge'
 *   Main/Events/ready.js:159             action.type === 'purge'
 * The package calls that phase 'expired' (matching the API). One meaning, two
 * spellings, translated in exactly one place: here.
 */
const moment = require('moment-timezone');
const { prisma } = require('@maker/database');
const { syncBotsToApiBackground } = require('./tokensWriteBridge');
const policy = require('@maker/subscriptions');

const { WARN_DAYS, GRACE_DAYS } = policy;

/** Package phase → legacy phase (`expired` is called `purge` in the Discord tree). */
function toLegacyPhase(phase) {
  if (phase === null || phase === undefined) return phase;
  return phase === 'expired' ? 'purge' : phase;
}

/** Moment | Date | string → Date, or null. Legacy callers pass all three. */
function toDate(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  return policy.parseSubscriptionDate(value);
}

/** Kept for callers that still want a moment back. */
function parseEndMoment(value) {
  const d = toDate(value);
  return d ? moment(d) : moment.invalid();
}

function formatBotDate(value) {
  return policy.formatBotDate(toDate(value));
}

/**
 * @returns {'active'|'warn'|'grace'|'purge'|null}
 */
function phaseForEndTime(endTime, now = moment()) {
  const nowDate = now instanceof Date ? now : toDate(now) || new Date();
  return toLegacyPhase(policy.phaseForEndTime(endTime, nowDate));
}

function graceUntilFromEnd(endTime) {
  const end = toDate(endTime);
  if (!end) return null;
  return moment(policy.graceUntilFor(end));
}

function isBotBlockedFromLogin(botOrMeta, now = new Date()) {
  return policy.isBotBlockedFromLogin(botOrMeta, now);
}

async function readActiveBots(db2) {
  const list = db2.get('Bots');
  return Array.isArray(list) ? list : [];
}

async function writeActiveBots(db2, list) {
  await db2.set('Bots', list);
  syncBotsToApiBackground(list);
}

function getGraceSnapshot(db222, clientId) {
  const id = String(clientId);
  const direct = db222.get(`Grace_${id}`);
  if (direct && typeof direct === 'object') return direct;
  const arr = db222.get('GraceBots');
  if (Array.isArray(arr)) {
    return arr.find((b) => String(b.ClientID) === id) || null;
  }
  return null;
}

async function saveGraceSnapshot(db222, bot) {
  const id = String(bot.ClientID);
  const end = policy.parseSubscriptionDate(bot.endTime);
  const graceUntil = end ? policy.graceUntilFor(end) : null;
  const snapshot = {
    ...bot,
    status: 'grace',
    graceUntil: graceUntil ? formatBotDate(graceUntil) : null,
    enteredGraceAt: formatBotDate(new Date()),
  };
  await db222.set(`Grace_${id}`, snapshot);
  // Do NOT set Expired_* here — that flag means permanent purge only.
  // Setting it during grace made purgeBot skip real deletion (already:true).
  let arr = db222.get('GraceBots');
  if (!Array.isArray(arr)) arr = [];
  arr = arr.filter((b) => String(b.ClientID) !== id);
  arr.push(snapshot);
  await db222.set('GraceBots', arr);
  return snapshot;
}

async function clearGraceSnapshot(db222, clientId) {
  const id = String(clientId);
  await db222.delete(`Grace_${id}`);
  // Keep Expired_* if set — permanent purge marker must survive
  let arr = db222.get('GraceBots');
  if (Array.isArray(arr)) {
    arr = arr.filter((b) => String(b.ClientID) !== id);
    await db222.set('GraceBots', arr);
  }
}

async function patchPgGraceMeta(clientId, patch) {
  const id = String(clientId);
  try {
    const row = await prisma.botInstance.findUnique({
      where: { clientId: id },
      select: { meta: true },
    });
    if (!row) return;
    const meta = {
      ...(typeof row.meta === 'object' && row.meta ? row.meta : {}),
      ...patch,
    };
    const result = await prisma.botInstance.updateMany({
      where: { clientId: id },
      data: { meta },
    });
    if (!result.count) {
      console.warn(`[lifecycle] PG meta patch skipped — no BotInstance for ${id}`);
    }
  } catch (err) {
    console.warn(`[lifecycle] PG meta patch failed for ${id}: ${err.message}`);
  }
}

async function stopLiveClient(clientId) {
  const id = String(clientId);
  try {
    const live = global.bots?.[id];
    if (live) {
      const token = live.makerToken || live.token;
      try {
        await live.destroy();
      } catch {
        /* ignore */
      }
      delete global.bots[id];
      if (global.botNotReadySince) global.botNotReadySince.delete(id);
      if (token && global.loggedInTokens) {
        global.loggedInTokens.delete(token);
        global.loggingInTokens?.delete(token);
      }
      console.log(`[lifecycle] stopped live client ${id}`);
    }
  } catch (err) {
    console.warn(`[lifecycle] stop live ${id}: ${err.message}`);
  }
}

/**
 * Enter grace: remove from active Tokens, stop Discord, runtime=false,
 * keep PG + Grace snapshot for renew window; return our token to unused pool.
 */
async function enterGrace(bot, deps) {
  const { db2, db222, rundb, tokenPoolDb, expiredTokensDb } = deps;
  const clientId = String(bot.ClientID);
  const graceUntil = graceUntilFromEnd(bot.endTime);
  if (!graceUntil) return { ok: false, reason: 'invalid_end' };

  // Already in grace store?
  if (getGraceSnapshot(db222, clientId)?.status === 'grace') {
    await stopLiveClient(clientId);
    if (rundb) await rundb.set(clientId, false);
    return { ok: true, already: true, graceUntil };
  }

  const active = await readActiveBots(db2);
  const remaining = active.filter((b) => String(b.ClientID) !== clientId);
  await writeActiveBots(db2, remaining);

  await saveGraceSnapshot(db222, bot);
  await patchPgGraceMeta(clientId, {
    warnedBefore: true,
    grace: true,
    graceUntil: formatBotDate(graceUntil),
    status: 'grace',
  });

  if (rundb) await rundb.set(clientId, false);
  try {
    const { runtimes } = require('./mainDb');
    await runtimes.setRunning(clientId, false);
  } catch {
    /* optional */
  }

  await stopLiveClient(clientId);

  const token = bot.Token;
  const tokenType = bot.TokenType;
  if (tokenType === 'our' && token) {
    try {
      if (tokenPoolDb) {
        const tokens = tokenPoolDb.get('Tokens') || tokenPoolDb.get('TOKENS') || [];
        if (!tokens.includes(token)) {
          await tokenPoolDb.push('Tokens', token);
        }
      }
    } catch (err) {
      console.warn(`[lifecycle] return token to pool: ${err.message}`);
    }
    try {
      if (expiredTokensDb) await expiredTokensDb.push('Tokens', token);
    } catch {
      /* optional */
    }
  }

  console.log(`[lifecycle] ${clientId} entered grace until ${formatBotDate(graceUntil)}`);
  return { ok: true, graceUntil };
}

/**
 * Full purge after grace window.
 */
async function purgeBot(bot, deps) {
  const { db2, db222, rundb, tokenPoolDb } = deps;
  const clientId = String(bot.ClientID || bot.clientId);
  const token = bot.Token;
  const tokenType = bot.TokenType;

  // Idempotent — permanently purged (Expired_*) and no remaining grace snapshot
  try {
    const alreadyExpired = Boolean(db222?.get?.(`Expired_${clientId}`));
    const stillInGrace = Boolean(getGraceSnapshot(db222, clientId));
    if (alreadyExpired && !stillInGrace) {
      // Still scrub ghost dashboard access / tokens if any linger
      try {
        await prisma.dashboardAccess.deleteMany({ where: { clientId } });
      } catch {
        /* optional */
      }
      return { ok: true, already: true };
    }
  } catch {
    /* ignore */
  }

  await stopLiveClient(clientId);

  const active = await readActiveBots(db2);
  const remaining = active.filter((b) => String(b.ClientID) !== clientId);
  if (remaining.length !== active.length) {
    await writeActiveBots(db2, remaining);
  }

  if (tokenType === 'our' && token && tokenPoolDb) {
    try {
      const tokens = tokenPoolDb.get('Tokens') || [];
      if (!tokens.includes(token)) await tokenPoolDb.push('Tokens', token);
    } catch {
      /* ignore */
    }
  }

  if (rundb) await rundb.set(clientId, false);

  // Keep Tokens.json / RunBots.json in sync (bot-health still reads disk)
  try {
    const fs = require('fs');
    const path = require('path');
    const root = path.resolve(__dirname, '..', '..', '..');
    const tokensFile = path.join(root, 'Database', 'Others', 'Tokens.json');
    const runFile = path.join(root, 'Database', 'BotMaker', 'RunBots.json');
    if (fs.existsSync(tokensFile)) {
      const raw = JSON.parse(fs.readFileSync(tokensFile, 'utf8') || '{}');
      const list = Array.isArray(raw.Bots) ? raw.Bots : [];
      const next = list.filter((b) => String(b.ClientID || b.clientId) !== clientId);
      if (next.length !== list.length) {
        const tmp = `${tokensFile}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify({ ...raw, Bots: next }, null, 2), 'utf8');
        fs.renameSync(tmp, tokensFile);
      }
    }
    if (fs.existsSync(runFile)) {
      const raw = JSON.parse(fs.readFileSync(runFile, 'utf8') || '{}');
      if (raw[clientId]) {
        raw[clientId] = false;
        const tmp = `${runFile}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(raw, null, 2), 'utf8');
        fs.renameSync(tmp, runFile);
      }
    }
  } catch (err) {
    console.warn(`[lifecycle] disk scrub ${clientId}: ${err.message}`);
  }

  try {
    const { runtimes, bots } = require('./mainDb');
    // Delete instance first (cascades runtime) — avoid P2003 on setRunning after delete
    await bots.deleteBotData(clientId);
    try {
      await runtimes.setRunning(clientId, false);
    } catch {
      /* instance gone — expected */
    }
  } catch (err) {
    console.error(`[lifecycle] purge prisma ${clientId}: ${err.message}`);
  }

  // Remove dashboard ghosts so /bots/mine does not keep showing Manage
  try {
    await prisma.dashboardAccess.deleteMany({ where: { clientId } });
  } catch (err) {
    console.warn(`[lifecycle] purge access ${clientId}: ${err.message}`);
  }

  await clearGraceSnapshot(db222, clientId);

  // Permanent purge marker LAST — must survive deleteBotData / clearGraceSnapshot
  try {
    if (db222?.set) await db222.set(`Expired_${clientId}`, true);
  } catch {
    /* ignore */
  }

  console.log(`[lifecycle] purged ${clientId}`);
  return { ok: true };
}

/**
 * Clear grace and restore bot to active Tokens after renew.
 */
async function restoreFromGrace(clientId, patch = {}, deps) {
  const { db2, db222, rundb } = deps;
  const id = String(clientId);
  const snap = getGraceSnapshot(db222, id);
  if (!snap) return { ok: false, reason: 'not_in_grace' };

  const restored = {
    ...snap,
    ...patch,
    status: 'active',
    grace: undefined,
    graceUntil: undefined,
    warnedBefore: false,
  };
  delete restored.status;
  delete restored.grace;
  delete restored.graceUntil;
  delete restored.enteredGraceAt;

  const active = await readActiveBots(db2);
  const without = active.filter((b) => String(b.ClientID) !== id);
  without.push(restored);
  await writeActiveBots(db2, without);

  await clearGraceSnapshot(db222, id);
  await patchPgGraceMeta(id, {
    warnedBefore: false,
    grace: false,
    graceUntil: null,
    status: 'active',
  });

  // Update endsAt on PG via setAllBots sync path
  try {
    const { bots } = require('./mainDb');
    await bots.setAllBots(without);
  } catch (err) {
    console.warn(`[lifecycle] restore sync: ${err.message}`);
  }

  if (rundb) await rundb.set(id, true);
  try {
    const { runtimes } = require('./mainDb');
    await runtimes.setRunning(id, true);
  } catch {
    /* optional */
  }

  // If our-token was returned to unused pool during grace, pull it back out
  try {
    if (restored.TokenType === 'our' && restored.Token && deps.tokenPoolDb) {
      await deps.tokenPoolDb.pull('Tokens', restored.Token);
    }
  } catch {
    /* optional */
  }

  console.log(`[lifecycle] restored ${id} from grace`);
  return { ok: true, bot: restored };
}

/**
 * Process one customer bot subscription tick.
 * Mutates tokens list via deps; returns actions taken for notifications.
 *
 * The decision comes from @maker/subscriptions.planCustomerAction(); this
 * function only performs it. `purge` keeps its legacy name in the returned
 * action type because Main/Events/ready.js dispatches on it.
 */
async function processCustomerBot(bot, deps, now = new Date()) {
  const decision = policy.planCustomerAction(bot, now);
  const actions = [];

  if (decision.type === 'clear_warn_flag') {
    bot.warnedBefore = false;
    actions.push({ type: 'clear_warn_flag' });
    const active = await readActiveBots(deps.db2);
    const next = active.map((b) =>
      String(b.ClientID) === String(bot.ClientID) ? { ...b, warnedBefore: false } : b,
    );
    await writeActiveBots(deps.db2, next);
    return actions;
  }

  if (decision.type === 'warn') {
    bot.warnedBefore = true;
    actions.push({ type: 'warn' });
    const active = await readActiveBots(deps.db2);
    const next = active.map((b) =>
      String(b.ClientID) === String(bot.ClientID) ? { ...b, warnedBefore: true } : b,
    );
    await writeActiveBots(deps.db2, next);
    return actions;
  }

  if (decision.type === 'grace') {
    const result = await enterGrace(bot, deps);
    if (result.ok && !result.already) {
      actions.push({ type: 'grace', graceUntil: result.graceUntil });
    }
    return actions;
  }

  if (decision.type === 'purge') {
    // Skip if already permanently purged (no grace left)
    try {
      const id = String(bot.ClientID);
      if (deps.db222?.get?.(`Expired_${id}`) && !getGraceSnapshot(deps.db222, id)) {
        return actions;
      }
    } catch {
      /* continue */
    }
    const snap = getGraceSnapshot(deps.db222, bot.ClientID) || bot;
    const result = await purgeBot(snap, deps);
    if (result?.ok && !result.already) {
      actions.push({ type: 'purge' });
    }
  }

  return actions;
}

/**
 * Tick grace-only snapshots that are no longer in active Tokens.
 */
async function processGraceSnapshots(deps, now = new Date()) {
  const { db222 } = deps;
  const actions = [];
  const arr = db222.get('GraceBots');
  if (!Array.isArray(arr)) return actions;
  for (const snap of [...arr]) {
    const phase = policy.phaseForEndTime(snap.endTime, now);
    if (phase !== 'expired' && phase !== null) continue;

    // A grace row is only purged once its own deadline passed, even when the
    // end date says expired — a renewal may have pushed graceUntil forward.
    const graceUntil = policy.parseSubscriptionDate(snap.graceUntil);
    if (phase !== 'expired' && !(graceUntil && now.getTime() >= graceUntil.getTime())) {
      continue;
    }

    const id = String(snap.ClientID || '');
    try {
      // Only skip if permanently purged AND grace row already cleared
      if (id && deps.db222?.get?.(`Expired_${id}`) && !getGraceSnapshot(deps.db222, id)) {
        continue;
      }
    } catch {
      /* purge */
    }
    const result = await purgeBot(snap, deps);
    if (result?.ok && !result.already) {
      actions.push({ type: 'purge', clientId: snap.ClientID, bot: snap });
    }
  }
  return actions;
}

async function findBotForRenew(clientId, db2, db222) {
  const id = String(clientId);
  const active = await readActiveBots(db2);
  const fromActive = active.find((b) => String(b.ClientID) === id);
  if (fromActive) return { bot: fromActive, source: 'active', list: active };
  const snap = getGraceSnapshot(db222, id);
  if (snap) return { bot: snap, source: 'grace', list: active };
  return { bot: null, source: null, list: active };
}

module.exports = {
  WARN_DAYS,
  GRACE_DAYS,
  parseEndMoment,
  phaseForEndTime,
  graceUntilFromEnd,
  isBotBlockedFromLogin,
  getGraceSnapshot,
  enterGrace,
  purgeBot,
  restoreFromGrace,
  processCustomerBot,
  processGraceSnapshots,
  findBotForRenew,
  formatBotDate,
};
