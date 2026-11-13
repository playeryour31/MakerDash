'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createScheduler, MIN_INTERVAL_MS } = require(
  path.join(__dirname, 'scheduler'),
);

/** Deterministic clock: time only moves when the test advances it. */
function fakeClock() {
  let nowMs = 0;
  let seq = 0;
  const pending = new Map();

  const clock = {
    setTimeout(fn, delay) {
      const id = ++seq;
      pending.set(id, { fn, at: nowMs + Math.max(0, delay) });
      return { id, unref() {} };
    },
    clearTimeout(handle) {
      if (handle) pending.delete(handle.id);
    },
  };

  return {
    clock,
    now: () => nowMs,
    /** Advance time and run every callback that became due, in order. */
    advance(ms) {
      const target = nowMs + ms;
      for (;;) {
        const next = [...pending.entries()]
          .filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [id, entry] = next;
        pending.delete(id);
        nowMs = entry.at;
        entry.fn();
      }
      nowMs = target;
    },
    pendingCount: () => pending.size,
  };
}

function setup(options = {}) {
  const time = fakeClock();
  const errors = [];
  const scheduler = createScheduler({
    clock: time.clock,
    now: time.now,
    onError: (err) => errors.push(err),
    ...options,
  });
  return { time, scheduler, errors };
}

test('does not fire before the interval elapses', () => {
  const { time, scheduler } = setup();
  let runs = 0;
  scheduler.every(1000, () => runs++, { name: 'a' });

  time.advance(999);
  assert.equal(runs, 0);

  time.advance(1);
  assert.equal(runs, 1);

  time.advance(1000);
  assert.equal(runs, 2);
});

test('keeps one armed timer no matter how many jobs exist', () => {
  const { time, scheduler } = setup();
  scheduler.every(1000, () => {}, { name: 'a' });
  scheduler.every(2000, () => {}, { name: 'b' });
  scheduler.every(500, () => {}, { name: 'c' });

  assert.equal(scheduler.stats().jobs, 3);
  assert.equal(scheduler.stats().timers, 1);
  assert.equal(time.pendingCount(), 1);
});

test('preserves cadence when a job is slower than its interval', async () => {
  const { time, scheduler } = setup();
  const firedAt = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  scheduler.every(
    100,
    () => {
      firedAt.push(time.now());
      return gate;
    },
    { name: 'slow' },
  );

  time.advance(100);
  assert.deepEqual(firedAt, [100]);

  // Three more intervals pass while the first run is still pending.
  time.advance(300);
  assert.deepEqual(firedAt, [100], 'an overlapping tick must be skipped');
  assert.equal(scheduler.stats().list[0].skipped, 3);

  release();
  await Promise.resolve();
  await Promise.resolve();

  time.advance(100);
  assert.deepEqual(firedAt, [100, 500], 'cadence stays on the original grid');
});

test('stopScope cancels exactly one bot and leaves the rest armed', () => {
  const { time, scheduler } = setup();
  let a = 0;
  let b = 0;
  scheduler.every(100, () => a++, { name: 'tick', scope: 'bot:1' });
  scheduler.every(100, () => b++, { name: 'tick', scope: 'bot:2' });

  assert.equal(scheduler.stopScope('bot:1'), 1);
  time.advance(300);

  assert.equal(a, 0);
  assert.equal(b, 3);
});

test('re-registering a name replaces the old job instead of duplicating', () => {
  const { time, scheduler } = setup();
  let first = 0;
  let second = 0;
  scheduler.every(100, () => first++, { name: 'job', scope: 's' });
  scheduler.every(100, () => second++, { name: 'job', scope: 's' });

  assert.equal(scheduler.size(), 1);
  time.advance(100);
  assert.equal(first, 0);
  assert.equal(second, 1);
});

test('a throwing job is reported once and keeps its slot', () => {
  const { time, scheduler, errors } = setup();
  let runs = 0;
  scheduler.every(
    100,
    () => {
      runs++;
      throw new Error('boom');
    },
    { name: 'bad' },
  );

  time.advance(100);
  assert.equal(runs, 1);
  assert.equal(errors.length, 1);

  time.advance(100);
  assert.equal(runs, 2, 'a failed run must not wedge the job');
});

test('after() runs once and then disappears', () => {
  const { time, scheduler } = setup();
  let runs = 0;
  scheduler.after(250, () => runs++, { name: 'once' });

  time.advance(249);
  assert.equal(runs, 0);
  time.advance(1);
  assert.equal(runs, 1);
  time.advance(5000);
  assert.equal(runs, 1);
  assert.equal(scheduler.size(), 0);
  assert.equal(scheduler.stats().timers, 0, 'no timer left armed when idle');
});

test('a one-shot job can re-plan itself under the same name', () => {
  const { time, scheduler } = setup();
  let runs = 0;
  const tick = () => {
    runs++;
    if (runs < 3) scheduler.after(100, tick, { name: 'loop' });
  };
  scheduler.after(100, tick, { name: 'loop' });

  time.advance(300);
  assert.equal(runs, 3);
});

test('clamps a zero/negative interval to the floor', () => {
  const { scheduler } = setup();
  const job = scheduler.every(0, () => {}, { name: 'z' });
  assert.equal(job.everyMs, MIN_INTERVAL_MS);
});

test('dispose stops everything and refuses further jobs', () => {
  const { time, scheduler } = setup();
  let runs = 0;
  scheduler.every(100, () => runs++, { name: 'a' });
  scheduler.dispose();

  time.advance(1000);
  assert.equal(runs, 0);
  assert.equal(scheduler.size(), 0);
  assert.equal(time.pendingCount(), 0);

  // Adding after dispose is a no-op rather than a crash.
  scheduler.every(100, () => runs++, { name: 'b' });
  time.advance(1000);
  assert.equal(runs, 0);
});

test('a job that throws synchronously does not block the next job due', () => {
  const { time, scheduler, errors } = setup();
  let good = 0;
  scheduler.every(
    100,
    () => {
      throw new Error('first');
    },
    { name: 'a-throws' },
  );
  scheduler.every(100, () => good++, { name: 'b-works' });

  time.advance(100);
  assert.equal(good, 1);
  assert.equal(errors.length, 1);
});
