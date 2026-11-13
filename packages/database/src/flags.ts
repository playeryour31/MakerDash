export type DataWriteMode = 'json' | 'dual' | 'postgres';
export type DataReadSource = 'json' | 'postgres';

export function getDataWriteMode(): DataWriteMode {
  const v = String(process.env.DATA_WRITE_MODE || 'dual').toLowerCase();
  if (v === 'json' || v === 'postgres' || v === 'dual') return v;
  return 'dual';
}

export function getDataReadSource(): DataReadSource {
  const v = String(process.env.DATA_READ_SOURCE || 'json').toLowerCase();
  if (v === 'postgres' || v === 'json') return v;
  return 'json';
}

export function shouldWriteJson(): boolean {
  const mode = getDataWriteMode();
  return mode === 'json' || mode === 'dual';
}

export function shouldWritePostgres(): boolean {
  const mode = getDataWriteMode();
  return mode === 'postgres' || mode === 'dual';
}

export function shouldReadPostgres(): boolean {
  return getDataReadSource() === 'postgres';
}

/**
 * Shadow-compare JSON vs Postgres on reads while dual-writing.
 * Default ON when write=dual and read=json (safe migration window).
 * Override with DATA_SHADOW_COMPARE=true|false.
 */
export function shouldShadowCompare(): boolean {
  const raw = process.env.DATA_SHADOW_COMPARE;
  if (raw !== undefined && String(raw).trim() !== '') {
    const v = String(raw).toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }
  return getDataWriteMode() === 'dual' && getDataReadSource() === 'json';
}

/** 0..1 — fraction of shadow reads that run a full compare (default 1). */
export function getShadowSampleRate(): number {
  const n = Number(process.env.DATA_SHADOW_SAMPLE_RATE ?? '1');
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

/** Mismatch count in the sliding window that triggers an alert (default 10). */
export function getMismatchAlertThreshold(): number {
  const n = Number(process.env.DATA_MISMATCH_ALERT_THRESHOLD ?? '10');
  if (!Number.isFinite(n) || n < 1) return 10;
  return Math.floor(n);
}

/** Sliding window for mismatch alerts in ms (default 60s). */
export function getMismatchAlertWindowMs(): number {
  const n = Number(process.env.DATA_MISMATCH_ALERT_WINDOW_MS ?? '60000');
  if (!Number.isFinite(n) || n < 1000) return 60_000;
  return Math.floor(n);
}

/**
 * 0..1 — fraction of mismatch events that emit a per-event warn log (default 1).
 * Counters/alerts always run; this only throttles noisy logs.
 */
export function getMismatchLogSampleRate(): number {
  const n = Number(process.env.DATA_MISMATCH_LOG_SAMPLE_RATE ?? '1');
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0, n));
}
