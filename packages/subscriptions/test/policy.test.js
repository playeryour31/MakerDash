'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const policy = require(path.join(__dirname, '..', 'dist', 'index.js'));

const DAY = 86_400_000;
const NOW = new Date('2026-06-15T12:00:00');

/** `YYYY-MM-DD HH:mm:ss` in local time, exactly as the legacy rows store it. */
function localStamp(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function at(offsetDays, base = NOW) {
  return new Date(base.getTime() + offsetDays * DAY);
}

// ── parsing ────────────────────────────────────────────────────────────────

test('parses the non-padded local format the legacy rows actually use', () => {
  const d = policy.parseSubscriptionDate('2026-6-5 9:07:03');
  assert.ok(d);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 5);
  assert.equal(d.getDate(), 5);
  assert.equal(d.getHours(), 9);
  assert.equal(d.getMinutes(), 7);
});

test('parses padded local, date-only and ISO shapes identically to Date', () => {
  assert.equal(
    policy.parseSubscriptionDate('2026-06-05 09:07:03').getTime(),
    new Date(2026, 5, 5, 9, 7, 3).getTime(),
  );
  // Date-only strings were local midnight in the legacy moment path, so they
  // stay local. `new Date('2026-06-05')` would be UTC and shift the instant.
  assert.equal(
    policy.parseSubscriptionDate('2026-06-05').getTime(),
    new Date(2026, 5, 5).getTime(),
  );
  const iso = new Date('2026-06-05T09:07:03.000Z');
  assert.equal(policy.parseSubscriptionDate(iso).getTime(), iso.getTime());
  assert.equal(
    policy.parseSubscriptionDate('2026-06-05T09:07:03.000Z').getTime(),
    iso.getTime(),
  );
});

test('rejects impossible dates instead of silently rolling them over', () => {
  // `new Date(2026, 1, 31)` would become March 3rd; that must not pass.
  assert.equal(policy.parseSubscriptionDate('2026-02-31 10:00:00'), null);
  assert.equal(policy.parseSubscriptionDate('2023-02-29 10:00:00'), null);
  assert.equal(policy.parseSubscriptionDate('2026-13-01 10:00:00'), null);
  assert.equal(policy.parseSubscriptionDate('2026-06-05 25:00:00'), null);
  assert.equal(policy.parseSubscriptionDate('not a date'), null);
  assert.equal(policy.parseSubscriptionDate(''), null);
  assert.equal(policy.parseSubscriptionDate(null), null);
  assert.equal(policy.parseSubscriptionDate(undefined), null);
});

test('accepts 24:00:00 as midnight of the following day, like moment did', () => {
  const d = policy.parseSubscriptionDate('2026-06-05 24:00:00');
  assert.ok(d);
  assert.equal(d.getDate(), 6);
  assert.equal(d.getHours(), 0);
});

test('formats back to the padded local shape', () => {
  assert.equal(policy.formatBotDate(new Date(2026, 0, 5, 4, 3, 2)), '2026-01-05 04:03:02');
  assert.equal(policy.formatBotDate(null), null);
  assert.equal(policy.formatBotDate(new Date('nope')), null);
});

test('round-trips every real endTime found in the legacy JSON stores', () => {
  const real = ['2025-09-18 11:07:36', '2025-06-05 21:25:06', '2026-04-23 20:47:29'];
  for (const value of real) {
    const parsed = policy.parseSubscriptionDate(value);
    assert.ok(parsed, `failed to parse ${value}`);
    assert.equal(policy.formatBotDate(parsed), value);
  }
});

// ── phases ─────────────────────────────────────────────────────────────────

test('phase boundaries land exactly on the 3 warn / 3 grace day marks', () => {
  const end = at(0);
  const endStr = localStamp(end);

  assert.equal(policy.phaseForEndTime(endStr, at(-10)), 'active');
  assert.equal(policy.phaseForEndTime(endStr, at(-3.001)), 'active');
  assert.equal(policy.phaseForEndTime(endStr, at(-3)), 'warn');
  assert.equal(policy.phaseForEndTime(endStr, at(-0.001)), 'warn');
  assert.equal(policy.phaseForEndTime(endStr, at(0)), 'grace');
  assert.equal(policy.phaseForEndTime(endStr, at(2.999)), 'grace');
  assert.equal(policy.phaseForEndTime(endStr, at(3)), 'expired');
  assert.equal(policy.phaseForEndTime(endStr, at(30)), 'expired');
});

test('an unparseable end date yields null, never a guessed phase', () => {
  assert.equal(policy.phaseForEndTime(null, NOW), null);
  assert.equal(policy.phaseForEndTime('garbage', NOW), null);
  assert.equal(policy.phaseForEndTime('', NOW), null);
});

// ── describe ───────────────────────────────────────────────────────────────

test('describe reports locked and renewable flags the dashboard relies on', () => {
  const inGrace = policy.describeSubscription(
    { endTime: localStamp(at(-1)) },
    { now: NOW },
  );
  assert.equal(inGrace.subscriptionStatus, 'grace');
  assert.equal(inGrace.locked, true);
  assert.equal(inGrace.renewable, true);
  assert.ok(inGrace.graceDaysLeft >= 1);
  assert.ok(inGrace.graceMsLeft > 0);

  const active = policy.describeSubscription(
    { endTime: localStamp(at(60)) },
    { now: NOW },
  );
  assert.equal(active.subscriptionStatus, 'active');
  assert.equal(active.locked, false);
  assert.equal(active.renewable, false);
  assert.equal(active.graceMsLeft, 0);
  assert.equal(active.graceDaysLeft, 0);
});

test('describe offers renewal inside the final 10 days', () => {
  const soon = policy.describeSubscription(
    { endTime: localStamp(at(5)) },
    { now: NOW },
  );
  assert.equal(soon.subscriptionStatus, 'active');
  assert.equal(soon.renewable, true);

  const far = policy.describeSubscription(
    { endTime: localStamp(at(11)) },
    { now: NOW },
  );
  assert.equal(far.renewable, false);
});

test('describe never marks an expired subscription renewable', () => {
  const gone = policy.describeSubscription(
    { endTime: localStamp(at(-30)) },
    { now: NOW },
  );
  assert.equal(gone.subscriptionStatus, 'expired');
  assert.equal(gone.locked, true);
  assert.equal(gone.renewable, false);
  assert.equal(gone.graceMsLeft, 0);
});

test('describe honours a grace flag even when the end date looks healthy', () => {
  const forced = policy.describeSubscription(
    { endTime: localStamp(at(30)), status: 'grace' },
    { now: NOW },
  );
  assert.equal(forced.subscriptionStatus, 'grace');
  assert.equal(forced.locked, true);

  const viaMeta = policy.describeSubscription(
    { endTime: localStamp(at(30)), meta: { grace: true, graceUntil: localStamp(at(2)) } },
    { now: NOW },
  );
  assert.equal(viaMeta.subscriptionStatus, 'grace');
  assert.equal(viaMeta.graceUntil, localStamp(at(2)));
});

test('describe keeps an expired bot expired even if grace is forced', () => {
  const both = policy.describeSubscription(
    { endTime: localStamp(at(-20)), status: 'grace' },
    { now: NOW },
  );
  assert.equal(both.subscriptionStatus, 'expired');
});

test('describe falls back to active when there is no end date at all', () => {
  const noDate = policy.describeSubscription({}, { now: NOW });
  assert.equal(noDate.subscriptionStatus, 'active');
  assert.equal(noDate.endTime, null);
  assert.equal(noDate.graceUntil, null);
});

// ── login gate ─────────────────────────────────────────────────────────────

test('blocks login once expired or flagged, allows it before', () => {
  assert.equal(policy.isBotBlockedFromLogin(null, NOW), false);
  assert.equal(
    policy.isBotBlockedFromLogin({ endTime: localStamp(at(5)) }, NOW),
    false,
  );
  assert.equal(
    policy.isBotBlockedFromLogin({ endTime: localStamp(at(-1)) }, NOW),
    true,
  );
  assert.equal(policy.isBotBlockedFromLogin({ status: 'grace' }, NOW), true);
  assert.equal(
    policy.isBotBlockedFromLogin({ graceUntil: localStamp(at(2)) }, NOW),
    true,
  );
  // A grace window that already closed still blocks: purge is what unblocks.
  assert.equal(
    policy.isBotBlockedFromLogin({ graceUntil: localStamp(at(-2)) }, NOW),
    true,
  );
});

// ── decisions ──────────────────────────────────────────────────────────────

test('plans warn exactly once per subscription', () => {
  const bot = { endTime: localStamp(at(1)) };
  assert.deepEqual(policy.planCustomerAction(bot, NOW), { type: 'warn' });
  assert.deepEqual(
    policy.planCustomerAction({ ...bot, warnedBefore: true }, NOW),
    { type: 'none' },
  );
});

test('clears the warn flag when the subscription was extended', () => {
  assert.deepEqual(
    policy.planCustomerAction({ endTime: localStamp(at(20)), warnedBefore: true }, NOW),
    { type: 'clear_warn_flag' },
  );
  assert.deepEqual(
    policy.planCustomerAction({ endTime: localStamp(at(20)), warnedBefore: false }, NOW),
    { type: 'none' },
  );
});

test('plans grace with the exact grace deadline', () => {
  const end = at(-1);
  const action = policy.planCustomerAction({ endTime: localStamp(end) }, NOW);
  assert.equal(action.type, 'grace');
  assert.equal(action.graceUntil.getTime(), end.getTime() + 3 * DAY);
});

test('plans purge past the grace window and ignores unknown dates', () => {
  assert.deepEqual(
    policy.planCustomerAction({ endTime: localStamp(at(-10)) }, NOW),
    { type: 'purge' },
  );
  assert.deepEqual(policy.planCustomerAction({ endTime: null }, NOW), { type: 'none' });
});

test('renewal window and end-date extension behave like the legacy code', () => {
  assert.equal(policy.canRenew(localStamp(at(5)), { now: NOW }), true);
  assert.equal(policy.canRenew(localStamp(at(30)), { now: NOW }), false);
  assert.equal(policy.canRenew(localStamp(at(30)), { inGrace: true, now: NOW }), true);

  // Extending an active subscription stacks on the existing end date.
  const extended = policy.renewalEndDate(localStamp(at(5)), 30, NOW);
  assert.equal(extended.getTime(), new Date(NOW.getTime() + 35 * DAY).getTime());

  // Extending a lapsed one starts from now, not from the stale end date.
  const revived = policy.renewalEndDate(localStamp(at(-40)), 30, NOW);
  assert.equal(revived.getTime(), new Date(NOW.getTime() + 30 * DAY).getTime());
});
