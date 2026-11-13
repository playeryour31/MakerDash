/**
 * Subscription policy — the single source of truth.
 *
 * This package is deliberately dependency-free and side-effect-free: no Prisma,
 * no Discord, no clock reads unless the caller passes `now`. Both the NestJS API
 * and the legacy Discord bots consume it, which is the only way to keep
 * "3 warn days / 3 grace days" from silently drifting between the two.
 *
 * Before this package the same policy existed three times:
 *   - src/shared/services/subscriptionLifecycle.js
 *   - Apps/api/src/bots/subscription-status.service.ts
 *   - a commented-out block in Main/Events/ready.js
 */

export const DAY_MS = 86_400_000;

/** Days before the end date at which the renewal warning starts. */
export const WARN_DAYS = 3;
/** Days after the end date during which the bot is locked but recoverable. */
export const GRACE_DAYS = 3;
/** Renewal is allowed this many days before the end date. */
export const RENEW_WITHIN_DAYS = 10;

/** Legacy lifecycle vocabulary. The 4th phase used to be called `purge`. */
export type SubscriptionPhase = 'active' | 'warn' | 'grace' | 'expired';

export type SubscriptionInfo = {
  subscriptionStatus: SubscriptionPhase;
  endTime: string | null;
  graceUntil: string | null;
  graceMsLeft: number;
  graceDaysLeft: number;
  locked: boolean;
  renewable: boolean;
  renewPrice: number | null;
};

const LOCAL_DATETIME = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})$/;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a subscription timestamp.
 *
 * Legacy rows store `YYYY-M-D HH:mm:ss` in **local** time (moment's strict
 * formats), while Postgres hands back `Date` objects and ISO strings. All three
 * shapes must resolve identically, because a mismatch shifts a bot's expiry.
 */
export function parseSubscriptionDate(value?: string | Date | null): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const local = LOCAL_DATETIME.exec(raw);
  if (local) {
    const [, y, mo, d, h, mi, s] = local.map(Number) as unknown as number[];

    // Reject calendar overflow (2026-02-31) instead of letting Date roll it
    // forward into March.
    const day = new Date(y, mo - 1, d);
    if (day.getFullYear() !== y || day.getMonth() !== mo - 1 || day.getDate() !== d) {
      return null;
    }
    if (h > 24 || mi > 59 || s > 59) return null;
    // Moment accepted 24:00:00 as midnight of the next day; 24:00:01 is invalid.
    if (h === 24 && (mi !== 0 || s !== 0)) return null;

    return new Date(y, mo - 1, d, h, mi, s);
  }

  // Date-only strings were local midnight in the legacy moment path, so they
  // must stay local: `new Date('2026-06-05')` would parse as UTC and shift the
  // instant by the timezone offset.
  const dateOnly = DATE_ONLY.exec(raw);
  if (dateOnly) {
    const [, y, mo, d] = dateOnly.map(Number) as unknown as number[];
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  const parsed = new Date(raw.includes(' ') ? raw.replace(' ', 'T') : raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `YYYY-MM-DD HH:mm:ss` in local time — the legacy storage format. */
export function formatBotDate(value: Date | string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ` +
    `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
  );
}

/** First instant of the warning window. */
export function warnStartFor(end: Date): Date {
  return new Date(end.getTime() - WARN_DAYS * DAY_MS);
}

/** Last instant the bot can still be revived. */
export function graceUntilFor(end: Date): Date {
  return new Date(end.getTime() + GRACE_DAYS * DAY_MS);
}

/** Classify a subscription at `now` (defaults to the current time). */
export function phaseForEndTime(
  endTime?: string | Date | null,
  now: Date = new Date(),
): SubscriptionPhase | null {
  const end = parseSubscriptionDate(endTime);
  if (!end) return null;
  if (now.getTime() < end.getTime() - WARN_DAYS * DAY_MS) return 'active';
  if (now.getTime() < end.getTime()) return 'warn';
  if (now.getTime() < end.getTime() + GRACE_DAYS * DAY_MS) return 'grace';
  return 'expired';
}

export type DescribeInput = {
  endTime?: string | Date | null;
  endsAt?: string | Date | null;
  graceUntil?: string | Date | null;
  status?: string | null;
  meta?: Record<string, unknown> | null;
};

export type DescribeOptions = {
  renewPrice?: number | null;
  forceGrace?: boolean;
  now?: Date;
};

/**
 * Build the subscription view for a bot row.
 *
 * This mirrors the legacy `SubscriptionStatusService.describe()` field for
 * field — the dashboard reads every one of them.
 */
export function describeSubscription(
  bot: DescribeInput,
  opts: DescribeOptions = {},
): SubscriptionInfo {
  const endRaw = bot.endTime || bot.endsAt || null;
  const end = parseSubscriptionDate(endRaw);
  const meta = bot.meta && typeof bot.meta === 'object' ? bot.meta : {};
  const metaGraceUntil = parseSubscriptionDate(
    bot.graceUntil || (meta.graceUntil as string | Date | null) || null,
  );
  const forceGrace =
    Boolean(opts.forceGrace) ||
    bot.status === 'grace' ||
    meta.status === 'grace' ||
    meta.grace === true;

  let phase = phaseForEndTime(end, opts.now);
  if (forceGrace && phase !== 'expired') phase = 'grace';
  if (!phase) phase = forceGrace ? 'grace' : 'active';

  const graceUntil = metaGraceUntil || (end ? graceUntilFor(end) : null) || null;
  const nowMs = (opts.now ?? new Date()).getTime();

  const graceMsLeft =
    phase === 'grace' && graceUntil ? Math.max(0, graceUntil.getTime() - nowMs) : 0;
  const graceDaysLeft = graceMsLeft > 0 ? Math.ceil(graceMsLeft / DAY_MS) : 0;

  const daysToEnd = end ? Math.floor((end.getTime() - nowMs) / DAY_MS) : Number.POSITIVE_INFINITY;

  const locked = phase === 'grace' || phase === 'expired';
  const renewable =
    phase === 'grace' ||
    ((phase === 'warn' || phase === 'active') && daysToEnd < RENEW_WITHIN_DAYS);

  return {
    subscriptionStatus: phase,
    endTime: end ? formatBotDate(end) : endRaw ? String(endRaw) : null,
    graceUntil: graceUntil ? formatBotDate(graceUntil) : null,
    graceMsLeft,
    graceDaysLeft,
    locked,
    renewable: Boolean(renewable && phase !== 'expired'),
    renewPrice: opts.renewPrice ?? null,
  };
}

export type BlockableBot = {
  status?: string | null;
  grace?: boolean;
  graceUntil?: string | Date | null;
  endTime?: string | Date | null;
  endsAt?: string | Date | null;
  meta?: { graceUntil?: string | Date | null } | null;
};

/**
 * Should this bot be refused a Discord login?
 *
 * Once a bot enters grace it stays blocked: the window only exists so the owner
 * can renew, not so the bot can keep running.
 */
export function isBotBlockedFromLogin(bot?: BlockableBot | null, now: Date = new Date()): boolean {
  if (!bot) return false;
  if (bot.status === 'grace' || bot.grace === true) return true;

  const graceUntil = bot.graceUntil || bot.meta?.graceUntil || null;
  const grace = parseSubscriptionDate(graceUntil);
  if (grace) return true; // inside or past the window — blocked either way

  const end = parseSubscriptionDate(bot.endTime || bot.endsAt);
  if (end && now.getTime() >= end.getTime()) return true;
  return false;
}

/**
 * What the lifecycle tick should do for one bot, given its current flags.
 *
 * Pure: the caller performs the side effects (Discord messages, cache writes,
 * token pool moves). Keeping the decision separate is what makes the policy
 * testable.
 */
export type CustomerAction =
  | { type: 'none' }
  | { type: 'clear_warn_flag' }
  | { type: 'warn' }
  | { type: 'grace'; graceUntil: Date }
  | { type: 'purge' };

export type CustomerBotState = {
  endTime?: string | Date | null;
  warnedBefore?: boolean;
};

export function planCustomerAction(bot: CustomerBotState, now: Date = new Date()): CustomerAction {
  const phase = phaseForEndTime(bot.endTime, now);

  if (phase === 'active') {
    return bot.warnedBefore ? { type: 'clear_warn_flag' } : { type: 'none' };
  }
  if (phase === 'warn') {
    return bot.warnedBefore ? { type: 'none' } : { type: 'warn' };
  }
  if (phase === 'grace') {
    const end = parseSubscriptionDate(bot.endTime)!;
    return { type: 'grace', graceUntil: graceUntilFor(end) };
  }
  if (phase === 'expired') return { type: 'purge' };
  return { type: 'none' };
}

/** Renewal is only offered inside the final `RENEW_WITHIN_DAYS` (or in grace). */
export function daysUntilEnd(endTime?: string | Date | null, now: Date = new Date()): number {
  const end = parseSubscriptionDate(endTime);
  if (!end) return Number.NEGATIVE_INFINITY;
  return Math.floor((end.getTime() - now.getTime()) / DAY_MS);
}

export function canRenew(
  endTime?: string | Date | null,
  opts: { inGrace?: boolean; now?: Date } = {},
): boolean {
  if (opts.inGrace) return true;
  return daysUntilEnd(endTime, opts.now) < RENEW_WITHIN_DAYS;
}

/** New end date after a renewal: extend from `now` when already lapsed. */
export function renewalEndDate(
  currentEnd: string | Date | null | undefined,
  months: number,
  now: Date = new Date(),
): Date {
  const end = parseSubscriptionDate(currentEnd);
  const base =
    !end || end.getTime() < now.getTime() ? new Date(now.getTime()) : new Date(end.getTime());
  base.setDate(base.getDate() + months);
  return base;
}
