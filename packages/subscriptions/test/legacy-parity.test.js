'use strict';

/**
 * Equivalence harness: replays the *old* implementations' outputs against the
 * new package over a dense time grid.
 *
 * This is the guard that matters. The three duplicated copies could have drifted
 * in ways nobody noticed, so before deleting them we prove the replacement
 * produces the same answer for every phase boundary, on real row shapes.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const moment = require('moment-timezone');

const policy = require(path.join(__dirname, '..', 'dist', 'index.js'));

const WARN_DAYS = 3;
const GRACE_DAYS = 3;
const RENEW_WITHIN_DAYS = 10;

// ── verbatim copies of the legacy implementations ──────────────────────────

/** From src/shared/services/subscriptionLifecycle.js (before phase 1). */
function legacyParseEndMoment(value) {
  if (!value) return moment.invalid();
  if (value instanceof Date) {
    const m = moment(value);
    return m.isValid() ? m : moment.invalid();
  }
  const m = moment(
    value,
    [
      'YYYY-M-D HH:mm:ss',
      'YYYY-MM-DD HH:mm:ss',
      'YYYY-M-D H:mm:ss',
      'YYYY-MM-DD H:mm:ss',
      moment.ISO_8601,
    ],
    true,
  );
  if (m.isValid()) return m;
  const loose = moment(new Date(String(value).replace(' ', 'T')));
  return loose.isValid() ? loose : moment.invalid();
}

/** From src/shared/services/subscriptionLifecycle.js (before phase 1). */
function legacyPhaseForEndTime(endTime, now = moment()) {
  const end = legacyParseEndMoment(endTime);
  if (!end.isValid()) return null;
  const warnAt = end.clone().subtract(WARN_DAYS, 'days');
  const graceUntil = end.clone().add(GRACE_DAYS, 'days');
  if (now.isBefore(warnAt)) return 'active';
  if (now.isBefore(end)) return 'warn';
  if (now.isBefore(graceUntil)) return 'grace';
  return 'purge';
}

/** From Apps/api/src/bots/subscription-status.service.ts (before phase 1). */
function legacyApiParseEnd(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** From Apps/api/src/bots/subscription-status.service.ts (before phase 1). */
function legacyApiPhaseForEndTime(endTime, now = new Date()) {
  const end = legacyApiParseEnd(endTime);
  if (!end) return null;
  const warnAt = new Date(end.getTime() - WARN_DAYS * 86_400_000);
  const graceUntil = new Date(end.getTime() + GRACE_DAYS * 86_400_000);
  if (now < warnAt) return 'active';
  if (now < end) return 'warn';
  if (now < graceUntil) return 'grace';
  return 'expired';
}

/** From Apps/api/src/bots/subscription-status.service.ts (before phase 1). */
function legacyApiDescribe(bot, opts = {}) {
  const endRaw = bot.endTime || bot.endsAt || null;
  const end = legacyApiParseEnd(endRaw);
  const meta = bot.meta && typeof bot.meta === 'object' ? bot.meta : {};
  const metaGraceUntil = legacyApiParseEnd(bot.graceUntil || meta.graceUntil || null);
  const forceGrace =
    opts.forceGrace || bot.status === 'grace' || meta.status === 'grace' || meta.grace === true;

  // The legacy service called `this.phaseForEndTime(end)` with no clock, so it
  // always used the real one. Thread the frozen clock through so the comparison
  // tests the *policy* and not the wall time.
  let phase = legacyApiPhaseForEndTime(end, opts.now);
  if (forceGrace && phase !== 'expired') phase = 'grace';
  if (!phase) phase = forceGrace ? 'grace' : 'active';

  const graceUntil =
    metaGraceUntil || (end ? new Date(end.getTime() + GRACE_DAYS * 86_400_000) : null) || null;

  const now = opts.now.getTime();
  const graceMsLeft =
    phase === 'grace' && graceUntil ? Math.max(0, graceUntil.getTime() - now) : 0;
  const graceDaysLeft = graceMsLeft > 0 ? Math.ceil(graceMsLeft / 86_400_000) : 0;
  const daysToEnd = end ? Math.floor((end.getTime() - now) / 86_400_000) : Number.POSITIVE_INFINITY;

  const locked = phase === 'grace' || phase === 'expired';
  const renewable =
    phase === 'grace' ||
    (phase === 'warn' && daysToEnd < RENEW_WITHIN_DAYS) ||
    (phase === 'active' && daysToEnd < RENEW_WITHIN_DAYS);

  return {
    subscriptionStatus: phase,
    graceMsLeft,
    graceDaysLeft,
    locked,
    renewable: Boolean(renewable && phase !== 'expired'),
  };
}

// ── the grid ───────────────────────────────────────────────────────────────

const NOW = new Date(2026, 5, 15, 12, 0, 0); // local noon, avoids DST edges
const DAY = 86_400_000;

function localStamp(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** End dates from 20 days ago to 20 days ahead, in 6-hour steps. */
const END_OFFSETS = [];
for (let h = -20 * 24; h <= 20 * 24; h += 6) END_OFFSETS.push(h / 24);

test('phase agrees with both legacy implementations across a dense grid', () => {
  const mismatches = [];

  for (const offset of END_OFFSETS) {
    const end = new Date(NOW.getTime() + offset * DAY);
    const endStr = localStamp(end);

    const oldJs = legacyPhaseForEndTime(endStr, moment(NOW));
    const oldApi = legacyApiPhaseForEndTime(endStr, NOW);
    const next = policy.phaseForEndTime(endStr, NOW);

    // The two legacy copies already disagreed on one point: the JS lifecycle
    // calls the final phase 'purge', the API calls it 'expired'. They mean the
    // same thing; the package standardises on 'expired'.
    const normalise = (p) => (p === 'purge' ? 'expired' : p);

    if (normalise(oldJs) !== normalise(next)) {
      mismatches.push(`js@${endStr}: ${oldJs} vs ${next}`);
    }
    if (oldApi !== next) {
      mismatches.push(`api@${endStr}: ${oldApi} vs ${next}`);
    }
  }

  assert.deepEqual(mismatches, [], `phase mismatches:\n${mismatches.join('\n')}`);
});

test('describe agrees with the legacy API service for every phase', () => {
  const mismatches = [];

  for (const offset of END_OFFSETS) {
    const end = new Date(NOW.getTime() + offset * DAY);
    const shapes = [
      { endTime: localStamp(end) },
      { endTime: localStamp(end), status: 'grace' },
      { endTime: localStamp(end), meta: { grace: true } },
      { endsAt: end },
    ];

    for (const shape of shapes) {
      const old = legacyApiDescribe(shape, { now: NOW });
      const next = policy.describeSubscription(shape, { now: NOW });

      for (const key of Object.keys(old)) {
        if (old[key] !== next[key]) {
          mismatches.push(
            `${JSON.stringify(shape)} ${key}: ${JSON.stringify(old[key])} vs ${JSON.stringify(next[key])}`,
          );
        }
      }
    }
  }

  assert.deepEqual(mismatches, [], `describe mismatches:\n${mismatches.slice(0, 20).join('\n')}`);
});

test('parsing agrees with moment on every shape seen in the data', () => {
  const shapes = [
    '2026-6-5 9:07:03',
    '2026-06-05 09:07:03',
    '2026-06-05',
    '2026-06-05T09:07:03Z',
    '2026-06-05T09:07:03.123Z',
    '2026-6-5 24:00:00',
    'garbage',
    '',
  ];

  for (const shape of shapes) {
    const old = legacyParseEndMoment(shape);
    const next = policy.parseSubscriptionDate(shape);

    if (!old.isValid()) {
      assert.equal(next, null, `legacy rejected ${JSON.stringify(shape)} but package accepted it`);
      continue;
    }
    assert.ok(next, `legacy accepted ${JSON.stringify(shape)} but package rejected it`);
    assert.equal(
      next.getTime(),
      old.valueOf(),
      `different instant for ${JSON.stringify(shape)}`,
    );
  }
});

test('rejects the impossible dates the legacy parser silently rolled over', () => {
  // Intentional divergence, not a regression. The legacy strict-format parse
  // failed on 2026-02-31, then the loose `new Date()` fallback accepted it and
  // rolled the expiry to March 3rd — a silently wrong billing date.
  for (const bad of ['2026-02-31 10:00:00', '2023-02-29 10:00:00', '2026-06-31 10:00:00']) {
    assert.ok(legacyParseEndMoment(bad).isValid(), `expected the legacy parser to accept ${bad}`);
    assert.equal(policy.parseSubscriptionDate(bad), null, `package must reject ${bad}`);
  }
});

test('login gate agrees with the legacy isBotBlockedFromLogin', () => {
  // Verbatim copy from the legacy lifecycle module.
  function legacyBlocked(botOrMeta, nowMoment = moment()) {
    if (!botOrMeta) return false;
    if (botOrMeta.status === 'grace' || botOrMeta.grace === true) return true;
    const graceUntil = botOrMeta.graceUntil || botOrMeta.meta?.graceUntil || null;
    if (graceUntil) {
      const g = legacyParseEndMoment(graceUntil);
      if (g.isValid() && nowMoment.isBefore(g)) return true;
      if (g.isValid() && !nowMoment.isBefore(g)) return true;
    }
    const end = legacyParseEndMoment(botOrMeta.endTime || botOrMeta.endsAt);
    if (end.isValid() && nowMoment.isSameOrAfter(end)) return true;
    return false;
  }

  const cases = [];
  for (const offset of END_OFFSETS) {
    const end = localStamp(new Date(NOW.getTime() + offset * DAY));
    cases.push({ endTime: end });
    cases.push({ endTime: end, status: 'grace' });
    cases.push({ endTime: end, graceUntil: end });
    cases.push({ endTime: end, meta: { graceUntil: end } });
  }
  cases.push({});

  for (const bot of cases) {
    assert.equal(
      policy.isBotBlockedFromLogin(bot, NOW),
      legacyBlocked(bot, moment(NOW)),
      `login gate differs for ${JSON.stringify(bot)}`,
    );
  }
});
