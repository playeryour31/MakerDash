import { Injectable, Logger } from '@nestjs/common';
import {
  getMismatchAlertThreshold,
  getMismatchAlertWindowMs,
  getMismatchLogSampleRate,
  getShadowSampleRate,
  shouldShadowCompare,
} from '@maker/database';

export type ConsistencyDomain =
  | 'bots'
  | 'runtime'
  | 'panels'
  | 'settings'
  | 'apply_kv'
  | 'pending'
  | 'language';

export type MismatchEvent = {
  id: string;
  at: string;
  domain: ConsistencyDomain;
  key: string;
  detail: string;
  jsonSample?: unknown;
  pgSample?: unknown;
};

export type AlertEvent = {
  id: string;
  at: string;
  windowMs: number;
  threshold: number;
  countInWindow: number;
  totalMismatches: number;
};

const MAX_EVENTS = 200;
const MAX_ALERTS = 50;

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

/** Strip volatile / secret fields before compare. */
export function normalizeBotForCompare(bot: any) {
  if (!bot || typeof bot !== 'object') return bot;
  const { Token, token, tokenEnc, ...rest } = bot;
  return {
    ClientID: String(rest.ClientID || rest.clientId || ''),
    Owner: String(rest.Owner || rest.ownerId || ''),
    Type: String(rest.Type || rest.type || ''),
    Server: String(
      rest.Server || rest.serverId || rest.guild || rest.guildId || '',
    ),
    guild: String(
      rest.guild || rest.guildId || rest.Server || rest.serverId || '',
    ),
    endTime: rest.endTime || null,
    startTime: rest.startTime || null,
    dashboardSlug: rest.dashboardSlug || null,
    TokenType: rest.TokenType || rest.tokenType || null,
    BotID: rest.BotID ?? rest.botNumber ?? null,
    Price: rest.Price ?? rest.price ?? null,
    language: rest.language || 'Ar',
  };
}

export function normalizePanelForCompare(panel: any) {
  if (!panel || typeof panel !== 'object') return panel;
  return {
    messageId: String(panel.messageId || panel.ID || ''),
    status: String(panel.status || 'on'),
    channel: String(panel.channel || panel.channelId || ''),
    message: String(panel.message || ''),
    appliedCount: Number(
      panel.appliedCount ??
        (Array.isArray(panel.applied) ? panel.applied.length : 0),
    ),
    applied: (Array.isArray(panel.applied) ? panel.applied : [])
      .map(String)
      .sort(),
  };
}

@Injectable()
export class DataConsistencyService {
  private readonly logger = new Logger('DataConsistency');
  private events: MismatchEvent[] = [];
  private alerts: AlertEvent[] = [];
  private mismatchTimestamps: number[] = [];
  private totals = {
    attempts: 0,
    sampled: 0,
    skippedSample: 0,
    compared: 0,
    matches: 0,
    mismatches: 0,
    logged: 0,
    suppressedLogs: 0,
    alerts: 0,
    byDomain: {} as Record<string, { compared: number; mismatches: number }>,
  };
  private seq = 0;
  private alertSeq = 0;
  private lastAlertAt = 0;

  isEnabled() {
    return shouldShadowCompare();
  }

  private sampleRate() {
    return getShadowSampleRate();
  }

  private logSampleRate() {
    return getMismatchLogSampleRate();
  }

  private alertThreshold() {
    return getMismatchAlertThreshold();
  }

  private alertWindowMs() {
    return getMismatchAlertWindowMs();
  }

  /** Decide whether this shadow attempt should run a full compare. */
  private shouldRunSampledCompare() {
    const rate = this.sampleRate();
    if (rate >= 1) return true;
    if (rate <= 0) return false;
    return Math.random() < rate;
  }

  private shouldLogMismatch() {
    const rate = this.logSampleRate();
    if (rate >= 1) return true;
    if (rate <= 0) return false;
    return Math.random() < rate;
  }

  private bumpDomain(domain: ConsistencyDomain, kind: 'compared' | 'mismatches') {
    if (!this.totals.byDomain[domain]) {
      this.totals.byDomain[domain] = { compared: 0, mismatches: 0 };
    }
    this.totals.byDomain[domain][kind] += 1;
  }

  private pruneWindow(now: number) {
    const cutoff = now - this.alertWindowMs();
    while (
      this.mismatchTimestamps.length &&
      this.mismatchTimestamps[0] < cutoff
    ) {
      this.mismatchTimestamps.shift();
    }
  }

  private maybeAlert(now: number) {
    this.pruneWindow(now);
    const threshold = this.alertThreshold();
    const countInWindow = this.mismatchTimestamps.length;
    if (countInWindow < threshold) return;

    // Cooldown: at most one alert per window
    if (now - this.lastAlertAt < this.alertWindowMs()) return;

    this.lastAlertAt = now;
    this.totals.alerts += 1;
    const event: AlertEvent = {
      id: `a${++this.alertSeq}`,
      at: new Date(now).toISOString(),
      windowMs: this.alertWindowMs(),
      threshold,
      countInWindow,
      totalMismatches: this.totals.mismatches,
    };
    this.alerts.push(event);
    if (this.alerts.length > MAX_ALERTS) {
      this.alerts.splice(0, this.alerts.length - MAX_ALERTS);
    }
    this.logger.error(
      `[ALERT] consistency mismatches ${countInWindow}/${threshold} in ${this.alertWindowMs()}ms (total=${this.totals.mismatches})`,
    );
  }

  getMetrics() {
    const now = Date.now();
    this.pruneWindow(now);
    const compared = this.totals.compared || 0;
    const mismatchRate =
      compared > 0 ? this.totals.mismatches / compared : 0;
    return {
      enabled: this.isEnabled(),
      config: {
        sampleRate: this.sampleRate(),
        logSampleRate: this.logSampleRate(),
        alertThreshold: this.alertThreshold(),
        alertWindowMs: this.alertWindowMs(),
      },
      counters: {
        ...this.totals,
        byDomain: { ...this.totals.byDomain },
      },
      rates: {
        mismatchRate: Number(mismatchRate.toFixed(6)),
        sampleHitRate:
          this.totals.attempts > 0
            ? Number((this.totals.sampled / this.totals.attempts).toFixed(4))
            : 0,
      },
      window: {
        mismatchesInWindow: this.mismatchTimestamps.length,
        alertArmed:
          this.mismatchTimestamps.length >= this.alertThreshold(),
      },
      recentAlerts: [...this.alerts].slice(-10).reverse(),
    };
  }

  getReport() {
    return {
      ...this.getMetrics(),
      readSource: process.env.DATA_READ_SOURCE || 'json',
      writeMode: process.env.DATA_WRITE_MODE || 'dual',
      recent: [...this.events].slice(-50).reverse(),
    };
  }

  clear() {
    this.events = [];
    this.alerts = [];
    this.mismatchTimestamps = [];
    this.lastAlertAt = 0;
    this.totals = {
      attempts: 0,
      sampled: 0,
      skippedSample: 0,
      compared: 0,
      matches: 0,
      mismatches: 0,
      logged: 0,
      suppressedLogs: 0,
      alerts: 0,
      byDomain: {},
    };
  }

  /**
   * Begin a shadow attempt. Returns false if disabled or sampled-out
   * (caller should skip expensive PG fetch when possible — optional).
   */
  beginAttempt(): boolean {
    if (!this.isEnabled()) return false;
    this.totals.attempts += 1;
    if (!this.shouldRunSampledCompare()) {
      this.totals.skippedSample += 1;
      return false;
    }
    this.totals.sampled += 1;
    return true;
  }

  private push(
    domain: ConsistencyDomain,
    key: string,
    detail: string,
    jsonSample?: unknown,
    pgSample?: unknown,
  ) {
    const now = Date.now();
    this.totals.mismatches += 1;
    this.bumpDomain(domain, 'mismatches');
    this.mismatchTimestamps.push(now);
    this.pruneWindow(now);

    const event: MismatchEvent = {
      id: `m${++this.seq}`,
      at: new Date(now).toISOString(),
      domain,
      key,
      detail,
      jsonSample,
      pgSample,
    };
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS);
    }

    if (this.shouldLogMismatch()) {
      this.totals.logged += 1;
      this.logger.warn(`[mismatch] ${domain} ${key}: ${detail}`);
    } else {
      this.totals.suppressedLogs += 1;
    }

    this.maybeAlert(now);
  }

  private markCompared(domain: ConsistencyDomain, matched: boolean) {
    this.totals.compared += 1;
    this.bumpDomain(domain, 'compared');
    if (matched) this.totals.matches += 1;
  }

  equal(a: unknown, b: unknown) {
    return stableStringify(a) === stableStringify(b);
  }

  /**
   * Fire-and-forget compare used by shadow reads.
   * Respects sample rate; never throws.
   */
  shadow(
    domain: ConsistencyDomain,
    key: string,
    jsonValue: unknown,
    pgValue: unknown,
    normalize?: (v: any) => any,
  ) {
    if (!this.beginAttempt()) return;
    this.shadowForced(domain, key, jsonValue, pgValue, normalize);
  }

  /** Always compare (e.g. PG already fetched for primary read). */
  shadowAlways(
    domain: ConsistencyDomain,
    key: string,
    jsonValue: unknown,
    pgValue: unknown,
    normalize?: (v: any) => any,
  ) {
    if (!this.isEnabled()) return;
    this.totals.attempts += 1;
    this.totals.sampled += 1;
    this.shadowForced(domain, key, jsonValue, pgValue, normalize);
  }

  /** Compare after beginAttempt() already returned true (no re-sample). */
  shadowForced(
    domain: ConsistencyDomain,
    key: string,
    jsonValue: unknown,
    pgValue: unknown,
    normalize?: (v: any) => any,
  ) {
    if (!this.isEnabled()) return;
    try {
      const left = normalize ? normalize(jsonValue) : jsonValue;
      const right = normalize ? normalize(pgValue) : pgValue;
      const ok = this.equal(left, right);
      this.markCompared(domain, ok);
      if (!ok) {
        this.push(domain, key, 'json !== postgres', left, right);
      }
    } catch (err: any) {
      this.logger.warn(
        `shadow compare failed (${domain}/${key}): ${err?.message || err}`,
      );
    }
  }

  recordMatch(domain: ConsistencyDomain) {
    this.markCompared(domain, true);
  }

  compareBotLists(
    jsonBots: any[],
    pgBots: any[],
    opts?: { skipAttemptAccounting?: boolean },
  ) {
    if (!this.isEnabled()) return { ok: true, mismatches: 0 };
    if (!opts?.skipAttemptAccounting) {
      this.totals.attempts += 1;
      this.totals.sampled += 1;
    }
    const jMap = new Map(
      (jsonBots || []).map((b) => [
        String(b.ClientID || b.clientId),
        normalizeBotForCompare(b),
      ]),
    );
    const pMap = new Map(
      (pgBots || []).map((b) => [
        String(b.ClientID || b.clientId),
        normalizeBotForCompare(b),
      ]),
    );
    let mismatches = 0;
    const ids = new Set([...jMap.keys(), ...pMap.keys()]);
    for (const id of ids) {
      if (!id) continue;
      const j = jMap.get(id);
      const p = pMap.get(id);
      if (!j) {
        mismatches++;
        this.markCompared('bots', false);
        this.push('bots', id, 'missing in JSON', undefined, p);
      } else if (!p) {
        mismatches++;
        this.markCompared('bots', false);
        this.push('bots', id, 'missing in Postgres', j, undefined);
      } else if (!this.equal(j, p)) {
        mismatches++;
        this.markCompared('bots', false);
        this.push('bots', id, 'field mismatch', j, p);
      } else {
        this.markCompared('bots', true);
      }
    }
    return {
      ok: mismatches === 0,
      mismatches,
      jsonCount: jMap.size,
      pgCount: pMap.size,
    };
  }

  compareRuntimeMaps(
    jsonMap: Record<string, boolean>,
    pgMap: Record<string, boolean>,
    opts?: { skipAttemptAccounting?: boolean },
  ) {
    if (!this.isEnabled()) return { ok: true, mismatches: 0 };
    if (!opts?.skipAttemptAccounting) {
      this.totals.attempts += 1;
      this.totals.sampled += 1;
    }
    let mismatches = 0;
    const ids = new Set([
      ...Object.keys(jsonMap || {}),
      ...Object.keys(pgMap || {}),
    ]);
    for (const id of ids) {
      const j = Boolean(jsonMap?.[id]);
      const p = Boolean(pgMap?.[id]);
      if (j !== p) {
        mismatches++;
        this.markCompared('runtime', false);
        this.push('runtime', id, `json=${j} pg=${p}`, j, p);
      } else {
        this.markCompared('runtime', true);
      }
    }
    return { ok: mismatches === 0, mismatches };
  }

  comparePanelLists(
    botId: string,
    jsonPanels: any[],
    pgPanels: any[],
    opts?: { skipAttemptAccounting?: boolean },
  ) {
    if (!this.isEnabled()) return { ok: true, mismatches: 0 };
    if (!opts?.skipAttemptAccounting) {
      this.totals.attempts += 1;
      this.totals.sampled += 1;
    }
    const jMap = new Map(
      (jsonPanels || []).map((p) => [
        String(p.messageId || p.ID),
        normalizePanelForCompare(p),
      ]),
    );
    const pMap = new Map(
      (pgPanels || []).map((p) => [
        String(p.messageId || p.ID),
        normalizePanelForCompare(p),
      ]),
    );
    let mismatches = 0;
    const ids = new Set([...jMap.keys(), ...pMap.keys()]);
    for (const id of ids) {
      if (!id) continue;
      const j = jMap.get(id);
      const p = pMap.get(id);
      if (!j) {
        mismatches++;
        this.markCompared('panels', false);
        this.push('panels', `${botId}:${id}`, 'missing in JSON', undefined, p);
      } else if (!p) {
        mismatches++;
        this.markCompared('panels', false);
        this.push(
          'panels',
          `${botId}:${id}`,
          'missing in Postgres',
          j,
          undefined,
        );
      } else if (!this.equal(j, p)) {
        mismatches++;
        this.markCompared('panels', false);
        this.push('panels', `${botId}:${id}`, 'field mismatch', j, p);
      } else {
        this.markCompared('panels', true);
      }
    }
    return { ok: mismatches === 0, mismatches };
  }

  compareSettings(
    botId: string,
    guildId: string,
    jsonS: any,
    pgS: any,
    opts?: { skipAttemptAccounting?: boolean },
  ) {
    if (!this.isEnabled()) return { ok: true };
    if (!opts?.skipAttemptAccounting) {
      this.totals.attempts += 1;
      this.totals.sampled += 1;
    }
    const norm = (s: any) => ({
      adminRoleId: s?.adminRoleId || null,
      logsChannelId: s?.logsChannelId || s?.resultsChannelId || null,
      dmMode: {
        accept: s?.dmMode?.accept || 'off',
        reject: s?.dmMode?.reject || 'off',
      },
      language: s?.language || 'Ar',
    });
    const j = norm(jsonS);
    const p = norm(pgS);
    if (!this.equal(j, p)) {
      this.markCompared('settings', false);
      this.push('settings', `${guildId}_${botId}`, 'settings mismatch', j, p);
      return { ok: false };
    }
    this.markCompared('settings', true);
    return { ok: true };
  }
}
