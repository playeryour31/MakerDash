'use strict';

/**
 * One timer for the whole process.
 *
 * Before this module the bot process owned 33 independent `setInterval`
 * timers: 18 in `Maker/Events/ready.js` (one per customer bot), 3 in
 * `Main/Events/ready.js`, and a handful in the protection/health helpers.
 * Two problems came with that:
 *
 *   1. `client.destroy()` never cleared them. A stopped or expired bot left
 *      its 18 loops running against a dead client — the expiry loop in
 *      particular kept calling `client.destroy()` and throwing every 30s for
 *      as long as the process lived.
 *   2. Overlapping ticks. `setInterval` fires again whether or not the
 *      previous async run finished, so a slow Discord call could start the
 *      same queue worker twice and post a panel twice.
 *
 * This scheduler keeps a single armed timer, holds jobs in a table keyed by
 * `scope + name`, and skips a tick while the previous one is still running.
 * Disposing a scope (a bot id) cancels everything that bot owned.
 *
 * Timing is preserved: a job fires at `lastRun + interval` rather than at
 * "the tick that happened to be closest", so a 7s giveaway poll stays 7s.
 */

const MIN_INTERVAL_MS = 10;

function createScheduler(options = {}) {
  const clock = options.clock || { setTimeout, clearTimeout };
  const now = options.now || Date.now;
  const onError =
    options.onError ||
    ((err, job) => {
      console.error(
        `[scheduler] ${job.scope ? `${job.scope}/` : ''}${job.name} failed:`,
        err?.message || err,
      );
    });

  /** key -> job */
  const jobs = new Map();
  let armedAt = null;
  let timer = null;
  let disposed = false;
  let sequence = 0;

  const keyOf = (name, scope) => (scope ? `${scope}::${name}` : String(name));

  function nextDue() {
    let due = Infinity;
    for (const job of jobs.values()) {
      if (job.dueAt < due) due = job.dueAt;
    }
    return due;
  }

  function disarm() {
    if (timer !== null) {
      clock.clearTimeout(timer);
      timer = null;
      armedAt = null;
    }
  }

  /** Arm the single timer for whichever job is due first. */
  function arm() {
    if (disposed) return;
    const due = nextDue();
    if (due === Infinity) {
      disarm();
      return;
    }
    // Already waiting for something no later than this job — nothing to do.
    if (timer !== null && armedAt !== null && armedAt <= due) return;
    disarm();
    const delay = Math.max(0, due - now());
    armedAt = due;
    timer = clock.setTimeout(() => {
      timer = null;
      armedAt = null;
      fire(now());
    }, delay);
    if (timer && typeof timer.unref === 'function') timer.unref();
  }

  function fire(at) {
    if (disposed) return;
    const due = [];
    for (const job of jobs.values()) {
      if (job.dueAt <= at) due.push(job);
    }
    for (const job of due) {
      // A job may have been replaced or cancelled by an earlier job in this
      // same tick (a "re-plan" like the azkar loop does exactly that).
      if (jobs.get(job.key) !== job) continue;

      if (job.once) {
        jobs.delete(job.key);
      } else {
        job.dueAt = at + job.everyMs;
      }

      if (job.running) {
        job.skipped += 1;
        continue;
      }
      job.running = true;
      job.runs += 1;
      job.lastRunAt = at;
      let result;
      try {
        result = job.fn();
      } catch (err) {
        job.running = false;
        onError(err, job);
        continue;
      }
      if (result && typeof result.then === 'function') {
        result.then(
          () => {
            job.running = false;
          },
          (err) => {
            job.running = false;
            onError(err, job);
          },
        );
      } else {
        job.running = false;
      }
    }
    arm();
  }

  function add(fn, ms, opts = {}) {
    if (typeof fn !== 'function') throw new TypeError('scheduler: fn required');
    if (disposed) return { name: opts.name, scope: opts.scope, stop() {} };

    const everyMs = Math.max(MIN_INTERVAL_MS, Number(ms) || 0);
    const scope = opts.scope ? String(opts.scope) : null;
    const name = String(opts.name || `job${++sequence}`);
    const key = keyOf(name, scope);

    const job = {
      key,
      name,
      scope,
      fn,
      everyMs,
      once: Boolean(opts.once),
      dueAt: now() + (opts.immediate ? 0 : everyMs),
      running: false,
      runs: 0,
      skipped: 0,
      lastRunAt: null,
      stop() {
        if (jobs.get(key) === job) jobs.delete(key);
      },
    };

    jobs.set(key, job);
    arm();
    return job;
  }

  return {
    /** Repeating job. Re-using `name` inside the same scope replaces it. */
    every(ms, fn, opts) {
      return add(fn, ms, opts);
    },

    /** One-shot job; `name` lets a job cancel/re-plan itself. */
    after(ms, fn, opts) {
      return add(fn, ms, { ...opts, once: true });
    },

    stop(name, scope) {
      const key = keyOf(name, scope);
      const job = jobs.get(key);
      if (!job) return false;
      jobs.delete(key);
      return true;
    },

    /** Cancel every job a single bot registered. */
    stopScope(scope) {
      if (!scope) return 0;
      const prefix = `${scope}::`;
      let removed = 0;
      for (const key of [...jobs.keys()]) {
        if (key.startsWith(prefix)) {
          jobs.delete(key);
          removed += 1;
        }
      }
      if (!jobs.size) disarm();
      return removed;
    },

    has(name, scope) {
      return jobs.has(keyOf(name, scope));
    },

    size() {
      return jobs.size;
    },

    stats() {
      return {
        jobs: jobs.size,
        armed: timer !== null,
        timers: timer !== null ? 1 : 0,
        list: [...jobs.values()].map((job) => ({
          name: job.name,
          scope: job.scope,
          everyMs: job.everyMs,
          once: job.once,
          runs: job.runs,
          skipped: job.skipped,
          lastRunAt: job.lastRunAt,
        })),
      };
    },

    dispose() {
      disposed = true;
      jobs.clear();
      disarm();
    },
  };
}

let shared = null;

/** The scheduler shared by the control bot and every customer bot. */
function getScheduler() {
  if (!shared) shared = createScheduler();
  return shared;
}

/**
 * Tie a Discord client's whole timer set to its own scope, so `destroy()`
 * cancels the jobs instead of orphaning them.
 *
 * Returns the scope string to pass to `every`/`after`. Idempotent: calling it
 * twice for the same client returns the same scope and leaves the wrapped
 * `destroy` in place.
 */
function bindClient(client, scheduler = getScheduler()) {
  const id = client?.user?.id;
  if (!id) return null;
  const scope = `bot:${id}`;

  if (client.__schedulerScope) return client.__schedulerScope;
  client.__schedulerScope = scope;

  const originalDestroy = client.destroy;
  if (typeof originalDestroy === 'function') {
    client.destroy = function destroyAndStopJobs(...args) {
      try {
        scheduler.stopScope(scope);
      } catch {
        /* never let cleanup break shutdown */
      }
      return originalDestroy.apply(this, args);
    };
  }

  return scope;
}

module.exports = {
  MIN_INTERVAL_MS,
  createScheduler,
  getScheduler,
  bindClient,
};
