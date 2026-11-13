'use strict';

/**
 * Debounced daily guild counters (messages / joins / leaves) → Postgres GuildDailyStat.
 */

const FLUSH_MS = 8000;

/** @type {Map<string, { messages: number, joins: number, leaves: number, memberCount: number|null }>} */
const pending = new Map();
let flushTimer = null;
let flushing = false;

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function bucketKey(botClientId, guildId, day) {
  return `${botClientId}\0${guildId}\0${day}`;
}

/**
 * @param {string} botClientId
 * @param {string} guildId
 * @param {'messages'|'joins'|'leaves'} field
 * @param {number|null|undefined} memberCount
 */
function increment(botClientId, guildId, field, memberCount) {
  if (!botClientId || !guildId) return;
  if (field !== 'messages' && field !== 'joins' && field !== 'leaves') return;
  const day = utcDayKey();
  const key = bucketKey(botClientId, guildId, day);
  let row = pending.get(key);
  if (!row) {
    row = { messages: 0, joins: 0, leaves: 0, memberCount: null };
    pending.set(key, row);
  }
  row[field] += 1;
  if (memberCount != null && Number.isFinite(Number(memberCount))) {
    row.memberCount = Math.max(0, Math.floor(Number(memberCount)));
  }
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush().catch(() => {});
  }, FLUSH_MS);
  if (typeof flushTimer.unref === 'function') flushTimer.unref();
}

async function flush() {
  if (flushing || pending.size === 0) return;
  flushing = true;
  const batch = new Map(pending);
  pending.clear();
  try {
    const { prisma } = require('@maker/database');
    for (const [key, delta] of batch) {
      const [botClientId, guildId, dayStr] = key.split('\0');
      const day = new Date(`${dayStr}T00:00:00.000Z`);
      try {
        await prisma.guildDailyStat.upsert({
          where: {
            botClientId_guildId_day: { botClientId, guildId, day },
          },
          create: {
            botClientId,
            guildId,
            day,
            messages: delta.messages,
            joins: delta.joins,
            leaves: delta.leaves,
            memberCount: delta.memberCount,
          },
          update: {
            messages: { increment: delta.messages },
            joins: { increment: delta.joins },
            leaves: { increment: delta.leaves },
            ...(delta.memberCount != null ? { memberCount: delta.memberCount } : {}),
          },
        });
      } catch (err) {
        const prev = pending.get(key) || {
          messages: 0,
          joins: 0,
          leaves: 0,
          memberCount: null,
        };
        pending.set(key, {
          messages: prev.messages + delta.messages,
          joins: prev.joins + delta.joins,
          leaves: prev.leaves + delta.leaves,
          memberCount:
            delta.memberCount != null ? delta.memberCount : prev.memberCount,
        });
        scheduleFlush();
        console.warn('[guildStats] flush failed:', err?.message || err);
      }
    }
  } catch (err) {
    for (const [key, delta] of batch) {
      const prev = pending.get(key) || {
        messages: 0,
        joins: 0,
        leaves: 0,
        memberCount: null,
      };
      pending.set(key, {
        messages: prev.messages + delta.messages,
        joins: prev.joins + delta.joins,
        leaves: prev.leaves + delta.leaves,
        memberCount:
          delta.memberCount != null ? delta.memberCount : prev.memberCount,
      });
    }
    scheduleFlush();
    console.warn('[guildStats] flush error:', err?.message || err);
  } finally {
    flushing = false;
  }
}

module.exports = {
  increment,
  flush,
  utcDayKey,
};
